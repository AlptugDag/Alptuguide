/**
 * AlptuguideMercuryTransmit.h
 * Adobe Premiere Pro C++ SDK — Mercury Transmit Plugin Header & Shared Memory Ring Buffer ABI
 *
 * Zero-Disk-IO, Zero-Polling 60fps Live Video Pipe from Premiere Pro Program Monitor
 * to CEP/UXP Panel (via POSIX shm_open / Win32 CreateFileMapping + Node.js / WebGL2).
 */

#pragma once

#include <stdint.h>
#include <stddef.h>
#include <atomic>

#if defined(_WIN32)
    #ifndef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
    #endif
    #include <windows.h>
    #define PR_PLUGIN_EXPORT extern "C" __declspec(dllexport)
#else
    #include <sys/mman.h>
    #include <sys/stat.h>
    #include <fcntl.h>
    #include <unistd.h>
    #define PR_PLUGIN_EXPORT extern "C" __attribute__((visibility("default")))
#endif

// Shared Memory Identifier used by both C++ Transmit Plugin and Node.js / Native Companion
#define ALPTUGUIDE_SHM_NAME_POSIX "/alptuguide_mercury_v1"
#define ALPTUGUIDE_SHM_NAME_WIN32 "Local\\AlptuguideMercuryV1"

// Magic header "ALPT" (0x54504C41)
#define ALPTUGUIDE_SHM_MAGIC      0x54504C41u
#define ALPTUGUIDE_SHM_VERSION    1u

// Maximum downscaled transmit resolution for panel preview (e.g., 1080x1920 RGBA8 = 8,294,400 bytes per slot)
#define ALPTUGUIDE_MAX_WIDTH      1080u
#define ALPTUGUIDE_MAX_HEIGHT     1920u
#define ALPTUGUIDE_BYTES_PER_PIX  4u
#define ALPTUGUIDE_SLOT_BYTES     (ALPTUGUIDE_MAX_WIDTH * ALPTUGUIDE_MAX_HEIGHT * ALPTUGUIDE_BYTES_PER_PIX)
#define ALPTUGUIDE_RING_SLOTS     2u

#pragma pack(push, 1)
struct AlptuguideShmHeader {
    uint32_t magic;              // ALPTUGUIDE_SHM_MAGIC (0x54504C41)
    uint32_t version;            // 1
    std::atomic<uint64_t> seq;   // Monotonically increasing frame counter (odd = writing, even = committed)
    uint32_t activeSlot;         // 0 or 1 (double-buffered ring index)
    uint32_t width;              // Active frame width in pixels
    uint32_t height;             // Active frame height in pixels
    uint32_t stride;             // Row bytes (width * 4)
    uint32_t pixelFormat;        // 1 = RGBA8888, 2 = BGRA8888
    int64_t  prTimeTicks;        // Premiere Pro PrTime playhead ticks (254016000000 ticks/sec)
    double   fps;                // Sequence frame rate
    uint8_t  isPlaying;          // 1 if playback clock is running, 0 if paused/scrubbing
    uint8_t  reserved[31];       // Pad header to 96 bytes alignment
};
#pragma pack(pop)

struct AlptuguideShmArena {
    AlptuguideShmHeader header;
    uint8_t slots[ALPTUGUIDE_RING_SLOTS][ALPTUGUIDE_SLOT_BYTES];
};

// Minimal subset of Adobe Premiere Pro Transmit SDK types for standalone compilation
// (When compiling inside official Premiere Pro SDK, include PrSDKTransmit.h & PrSDKPPixSuite.h)
#ifndef PRSDKTRANSMIT_H
typedef int32_t tmResult;
typedef int64_t PrTime;
typedef void*   PPixHand;
typedef int32_t csSDK_int32;
typedef uint32_t csSDK_uint32;

enum {
    tmResult_Success = 0,
    tmResult_ContinueIterate = 1,
    tmResult_Failure = -1
};

enum {
    tmCommand_Init = 1,
    tmCommand_Terminate = 2,
    tmCommand_SetupDialog = 3,
    tmCommand_NeedsReset = 4,
    tmCommand_CreateInstance = 5,
    tmCommand_DisposeInstance = 6,
    tmCommand_QueryAudioMode = 7,
    tmCommand_QueryVideoMode = 8,
    tmCommand_ActivateDeactivate = 9,
    tmCommand_StartPlaybackClock = 10,
    tmCommand_StopPlaybackClock = 11,
    tmCommand_PushVideo = 12
};

enum PrPixelFormat {
    PrPixelFormat_BGRA_4444_8u = 0x42475241, // 'BGRA'
    PrPixelFormat_VUYA_4444_8u = 0x56555941  // 'VUYA'
};

struct PrSDKPPixSuite {
    int32_t (*GetPixels)(PPixHand inPPixHand, int32_t inAccess, char** outPixelAddress);
    int32_t (*GetBounds)(PPixHand inPPixHand, struct prRect* outBounds);
    int32_t (*GetRowBytes)(PPixHand inPPixHand, int32_t* outRowBytes);
    int32_t (*GetPixelFormat)(PPixHand inPPixHand, PrPixelFormat* outPixelFormat);
    int32_t (*Dispose)(PPixHand inPPixHand);
};

struct prRect {
    int32_t left;
    int32_t top;
    int32_t right;
    int32_t bottom;
};

struct tmStdParms {
    void* ioSerializedPluginData;
    size_t ioSerializedPluginDataSize;
    PrSDKPPixSuite* piSuites;
};

struct tmPluginInfo {
    char outIdentifier[256];
    char outDisplayName[256];
    bool outAudioAvailable;
    bool outVideoAvailable;
    bool outHasSetup;
};

struct tmInstance {
    void* ioPrivateInstanceData;
    csSDK_int32 inInstanceID;
};

struct tmVideoMode {
    csSDK_int32 outWidth;
    csSDK_int32 outHeight;
    PrPixelFormat outPixelFormat;
    PrTime outPARNum;
    PrTime outPARDen;
};

struct tmPushVideo {
    PrTime inTime;
    bool inPlaying;
    PPixHand inFrame;
};
#endif
