/**
 * AlptuguideMercuryTransmit.cpp
 * Adobe Premiere Pro C++ SDK — Mercury Transmit Plugin Implementation
 *
 * Streams live uncompressed video frames directly from the Premiere Pro Program Monitor
 * into a lock-free double-buffered Shared Memory arena (POSIX shm_open / Win32 FileMapping)
 * at 60fps with ZERO disk I/O and ZERO playhead polling.
 *
 * Build (macOS Universal Bundle):
 *   clang++ -std=c++17 -O3 -dynamiclib -arch arm64 -arch x86_64 \
 *     AlptuguideMercuryTransmit.cpp -o AlptuguideMercuryTransmit.bundle
 *   cp -R AlptuguideMercuryTransmit.bundle "/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/"
 */

#include "AlptuguideMercuryTransmit.h"
#include <cstring>
#include <algorithm>

namespace {

constexpr int64_t kPrTicksPerSecond = 254016000000LL;

struct TransmitContext {
    AlptuguideShmArena* shmArena = nullptr;
    size_t shmSize = sizeof(AlptuguideShmArena);
#if defined(_WIN32)
    HANDLE hMapFile = nullptr;
#else
    int shmFd = -1;
#endif
    bool isActive = false;
    bool isPlaying = false;

    bool initSharedMemory() {
        if (shmArena) return true;
#if defined(_WIN32)
        hMapFile = CreateFileMappingA(
            INVALID_HANDLE_VALUE,
            nullptr,
            PAGE_READWRITE,
            static_cast<DWORD>((shmSize >> 32) & 0xFFFFFFFFu),
            static_cast<DWORD>(shmSize & 0xFFFFFFFFu),
            ALPTUGUIDE_SHM_NAME_WIN32
        );
        if (!hMapFile) return false;
        shmArena = static_cast<AlptuguideShmArena*>(
            MapViewOfFile(hMapFile, FILE_MAP_ALL_ACCESS, 0, 0, shmSize)
        );
        if (!shmArena) {
            CloseHandle(hMapFile);
            hMapFile = nullptr;
            return false;
        }
#else
        shmFd = shm_open(ALPTUGUIDE_SHM_NAME_POSIX, O_CREAT | O_RDWR, 0666);
        if (shmFd < 0) return false;
        if (ftruncate(shmFd, static_cast<off_t>(shmSize)) != 0) {
            close(shmFd);
            shmFd = -1;
            return false;
        }
        void* mapped = mmap(nullptr, shmSize, PROT_READ | PROT_WRITE, MAP_SHARED, shmFd, 0);
        if (mapped == MAP_FAILED) {
            close(shmFd);
            shmFd = -1;
            return false;
        }
        shmArena = static_cast<AlptuguideShmArena*>(mapped);
#endif
        shmArena->header.magic = ALPTUGUIDE_SHM_MAGIC;
        shmArena->header.version = ALPTUGUIDE_SHM_VERSION;
        shmArena->header.seq.store(0, std::memory_order_release);
        shmArena->header.activeSlot = 0;
        shmArena->header.width = 0;
        shmArena->header.height = 0;
        shmArena->header.stride = 0;
        shmArena->header.pixelFormat = 1; // RGBA8888
        return true;
    }

    void closeSharedMemory() {
#if defined(_WIN32)
        if (shmArena) {
            UnmapViewOfFile(shmArena);
            shmArena = nullptr;
        }
        if (hMapFile) {
            CloseHandle(hMapFile);
            hMapFile = nullptr;
        }
#else
        if (shmArena) {
            munmap(shmArena, shmSize);
            shmArena = nullptr;
        }
        if (shmFd >= 0) {
            close(shmFd);
            shmFd = -1;
        }
#endif
    }
};

// Fast BGRA (Premiere bottom-up or top-down) -> RGBA8888 top-down copy with optional box downscale
static void BlitBGRA8ToRGBA8(
    const uint8_t* srcBase,
    int32_t srcRowBytes,
    uint32_t srcW,
    uint32_t srcH,
    uint8_t* dstBase,
    uint32_t dstW,
    uint32_t dstH
) {
    const uint32_t dstStride = dstW * 4u;
    const bool bottomUp = (srcRowBytes > 0); // Premiere PPix BGRA is bottom-up when rowBytes > 0
    const int32_t absRowBytes = srcRowBytes < 0 ? -srcRowBytes : srcRowBytes;

    for (uint32_t y = 0; y < dstH; ++y) {
        const uint32_t srcY = (y * srcH) / dstH;
        const uint32_t rowIdx = bottomUp ? (srcH - 1u - srcY) : srcY;
        const uint8_t* srcRow = srcBase + static_cast<size_t>(rowIdx) * static_cast<size_t>(absRowBytes);
        uint8_t* dstRow = dstBase + static_cast<size_t>(y) * dstStride;

        if (srcW == dstW) {
            for (uint32_t x = 0; x < dstW; ++x) {
                const uint32_t i = x * 4u;
                dstRow[i + 0] = srcRow[i + 2]; // R
                dstRow[i + 1] = srcRow[i + 1]; // G
                dstRow[i + 2] = srcRow[i + 0]; // B
                dstRow[i + 3] = srcRow[i + 3]; // A
            }
        } else {
            for (uint32_t x = 0; x < dstW; ++x) {
                const uint32_t srcX = (x * srcW) / dstW;
                const uint32_t si = srcX * 4u;
                const uint32_t di = x * 4u;
                dstRow[di + 0] = srcRow[si + 2];
                dstRow[di + 1] = srcRow[si + 1];
                dstRow[di + 2] = srcRow[si + 0];
                dstRow[di + 3] = srcRow[si + 3];
            }
        }
    }
}

static TransmitContext gGlobalCtx;

} // namespace

// ============================================================================
// Adobe Premiere Pro Mercury Transmit Entry Point
// ============================================================================
PR_PLUGIN_EXPORT tmResult tmEntryMain(
    csSDK_int32 inCommand,
    tmStdParms* ioStdParms,
    void* ioParam1,
    void* ioParam2
) {
    switch (inCommand) {
        case tmCommand_Init: {
            tmPluginInfo* info = static_cast<tmPluginInfo*>(ioParam1);
            if (info) {
                std::strncpy(info->outIdentifier, "com.alptug.alptuguide.mercurytransmit", sizeof(info->outIdentifier) - 1);
                std::strncpy(info->outDisplayName, "Alptuguide Live Panel Transmit (Zero-Lag)", sizeof(info->outDisplayName) - 1);
                info->outAudioAvailable = false;
                info->outVideoAvailable = true;
                info->outHasSetup = false;
            }
            gGlobalCtx.initSharedMemory();
            return tmResult_Success;
        }

        case tmCommand_Terminate: {
            gGlobalCtx.closeSharedMemory();
            return tmResult_Success;
        }

        case tmCommand_CreateInstance: {
            tmInstance* inst = static_cast<tmInstance*>(ioParam1);
            if (inst) {
                inst->ioPrivateInstanceData = &gGlobalCtx;
            }
            gGlobalCtx.initSharedMemory();
            return tmResult_Success;
        }

        case tmCommand_DisposeInstance: {
            return tmResult_Success;
        }

        case tmCommand_QueryVideoMode: {
            // Request BGRA_4444_8u directly from Mercury Playback Engine GPU/CPU
            const csSDK_int32 iteration = static_cast<csSDK_int32>(reinterpret_cast<intptr_t>(ioParam1));
            tmVideoMode* mode = static_cast<tmVideoMode*>(ioParam2);
            if (iteration > 0 || !mode) {
                return tmResult_Failure;
            }
            mode->outWidth = 0;  // 0 = match active sequence resolution natively
            mode->outHeight = 0;
            mode->outPixelFormat = PrPixelFormat_BGRA_4444_8u;
            mode->outPARNum = 1;
            mode->outPARDen = 1;
            return tmResult_ContinueIterate;
        }

        case tmCommand_ActivateDeactivate: {
            const bool activate = (ioParam2 != nullptr);
            gGlobalCtx.isActive = activate;
            return tmResult_Success;
        }

        case tmCommand_StartPlaybackClock: {
            gGlobalCtx.isPlaying = true;
            if (gGlobalCtx.shmArena) {
                gGlobalCtx.shmArena->header.isPlaying = 1;
            }
            return tmResult_Success;
        }

        case tmCommand_StopPlaybackClock: {
            gGlobalCtx.isPlaying = false;
            if (gGlobalCtx.shmArena) {
                gGlobalCtx.shmArena->header.isPlaying = 0;
            }
            return tmResult_Success;
        }

        case tmCommand_PushVideo: {
            // Invoked by Mercury Playback Engine on EVERY rendered frame (60fps playback + scrubbing)
            tmPushVideo* push = static_cast<tmPushVideo*>(ioParam2);
            if (!push || !push->inFrame || !ioStdParms || !ioStdParms->piSuites) {
                return tmResult_Success;
            }
            if (!gGlobalCtx.shmArena && !gGlobalCtx.initSharedMemory()) {
                return tmResult_Success;
            }

            PrSDKPPixSuite* ppix = ioStdParms->piSuites;
            char* rawPixels = nullptr;
            prRect bounds = { 0, 0, 0, 0 };
            int32_t rowBytes = 0;

            if (ppix->GetPixels(push->inFrame, 1 /* PrPPixBufferAccess_ReadOnly */, &rawPixels) != 0 || !rawPixels) {
                return tmResult_Success;
            }
            ppix->GetBounds(push->inFrame, &bounds);
            ppix->GetRowBytes(push->inFrame, &rowBytes);

            const uint32_t srcW = static_cast<uint32_t>(std::max<int32_t>(1, bounds.right - bounds.left));
            const uint32_t srcH = static_cast<uint32_t>(std::max<int32_t>(1, bounds.bottom - bounds.top));

            // Fit within ALPTUGUIDE_MAX_WIDTH x ALPTUGUIDE_MAX_HEIGHT while preserving aspect ratio
            const double scale = std::min<double>(
                1.0,
                std::min<double>(
                    static_cast<double>(ALPTUGUIDE_MAX_WIDTH) / srcW,
                    static_cast<double>(ALPTUGUIDE_MAX_HEIGHT) / srcH
                )
            );
            const uint32_t dstW = std::max<uint32_t>(2u, static_cast<uint32_t>(srcW * scale) & ~1u);
            const uint32_t dstH = std::max<uint32_t>(2u, static_cast<uint32_t>(srcH * scale) & ~1u);

            AlptuguideShmArena* arena = gGlobalCtx.shmArena;
            const uint32_t nextSlot = (arena->header.activeSlot + 1u) % ALPTUGUIDE_RING_SLOTS;

            // Lock-free seqlock write protocol:
            // 1. Write pixel payload into inactive slot (nextSlot)
            BlitBGRA8ToRGBA8(
                reinterpret_cast<const uint8_t*>(rawPixels),
                rowBytes,
                srcW,
                srcH,
                arena->slots[nextSlot],
                dstW,
                dstH
            );

            // 2. Increment sequence to odd, update metadata, then commit even sequence
            const uint64_t prevSeq = arena->header.seq.load(std::memory_order_relaxed);
            arena->header.seq.store(prevSeq + 1u, std::memory_order_release);

            arena->header.width = dstW;
            arena->header.height = dstH;
            arena->header.stride = dstW * 4u;
            arena->header.pixelFormat = 1u; // RGBA8888
            arena->header.prTimeTicks = push->inTime;
            arena->header.isPlaying = push->inPlaying ? 1u : 0u;
            arena->header.activeSlot = nextSlot;

            arena->header.seq.store(prevSeq + 2u, std::memory_order_release);
            return tmResult_Success;
        }

        default:
            return tmResult_Success;
    }
}
