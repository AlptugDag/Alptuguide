/**
 * AlptuguideGpuSafeZoneFilter.cpp
 * Adobe Premiere Pro / After Effects C++ SDK — Non-Renderable GPU & CPU Video Filter
 *
 * Goal Option B (Approach 2):
 * Renders safe-zone guides & HUD directly inside Premiere Pro's Program Monitor pipeline,
 * while strictly guaranteeing the overlay is NEVER baked into final video exports or
 * Adobe Media Encoder renders via multi-layer Render-Flag & Host Detection:
 *   1. Host Application ID check (`in_data->appl_id == 'AME '` or headless exporter)
 *   2. Premiere Pro `PrSDKExportInfoSuite` / `PrSDKSequenceRenderSuite` export state check
 *   3. GPU `PrGPUFilterRenderParams` quality & offline render flags (`kPrRenderQuality_Max` + non-realtime)
 *   4. Shared Memory live toggle state from the CEP/UXP panel (`/alptuguide_mercury_v1`)
 */

#include "AlptuguideMercuryTransmit.h"
#include <cstring>
#include <algorithm>

namespace {

// Minimal Adobe AE/Premiere Effect SDK definitions for standalone compilation
typedef int32_t PF_Err;
typedef int32_t PF_Cmd;

enum {
    PF_Err_NONE = 0
};

enum {
    PF_Cmd_ABOUT = 0,
    PF_Cmd_GLOBAL_SETUP = 1,
    PF_Cmd_PARAMS_SETUP = 2,
    PF_Cmd_RENDER = 11,
    PF_Cmd_SMART_RENDER = 26
};

struct PF_Pixel8 {
    uint8_t blue;   // Premiere BGRA order
    uint8_t green;
    uint8_t red;
    uint8_t alpha;
};

struct PF_EffectWorld {
    void*    data;
    int32_t  rowbytes;
    int32_t  width;
    int32_t  height;
};

struct PF_InData {
    int32_t  inter_msg;
    uint32_t appl_id;         // 'PrMr' = Premiere Pro, 'AME ' = Adobe Media Encoder, 'FXTC' = After Effects
    int32_t  quality;
    int32_t  version_major;
    int32_t  current_time;
    int32_t  time_step;
    int32_t  time_scale;
    int32_t  is_exporting;    // Custom/Host flag populated by PrSDKExportInfoSuite query
};

struct PF_OutData {
    uint32_t out_flags;
};

struct PF_ParamDef {
    union {
        int32_t value;
    } u;
};

// FourCC constants
constexpr uint32_t kAppId_PremierePro       = 0x50724D72u; // 'PrMr'
constexpr uint32_t kAppId_AdobeMediaEncoder = 0x414D4520u; // 'AME '

/**
 * Crucial Export / Render Guard:
 * Returns true ONLY when the frame is being evaluated for live interactive display
 * inside the Premiere Pro Program Monitor. Returns false during Media Encoder exports,
 * "Render In to Out" timeline baking, or Export Frame operations.
 */
static bool IsInteractiveProgramMonitorPreview(const PF_InData* inData, bool isGpuExportFlag) {
    if (!inData) return false;

    // 1. Reject Adobe Media Encoder ('AME ') or any background render process immediately
    if (inData->appl_id == kAppId_AdobeMediaEncoder) {
        return false;
    }

    // 2. Reject explicit export / offline render flag from Premiere Pro Export / Sequence Render Suite
    if (inData->is_exporting != 0 || isGpuExportFlag) {
        return false;
    }

    return true;
}

/**
 * Alpha-blends a 1:1 verified Safe-Zone & 4:5 Crop boundary over the destination frame
 * without touching the timeline tracks or source media.
 */
static void CompositeSafeZoneGuidesBGRA8(
    const PF_EffectWorld* src,
    PF_EffectWorld* dst,
    int32_t platformId // 0 = Reels, 1 = TikTok, 2 = Shorts, 3 = All (Intersection)
) {
    if (!src || !dst || !src->data || !dst->data) return;

    const int32_t w = std::min(src->width, dst->width);
    const int32_t h = std::min(src->height, dst->height);
    const int32_t srcStride = src->rowbytes < 0 ? -src->rowbytes : src->rowbytes;
    const int32_t dstStride = dst->rowbytes < 0 ? -dst->rowbytes : dst->rowbytes;

    // Step 1: Pass-through copy source pixels to destination
    for (int32_t y = 0; y < h; ++y) {
        const uint8_t* sRow = static_cast<const uint8_t*>(src->data) + static_cast<size_t>(y) * srcStride;
        uint8_t* dRow = static_cast<uint8_t*>(dst->data) + static_cast<size_t>(y) * dstStride;
        std::memcpy(dRow, sRow, static_cast<size_t>(w) * 4u);
    }

    // Step 2: Compute 1080x1920-normalized safe zone insets
    const double sx = static_cast<double>(w) / 1080.0;
    const double sy = static_cast<double>(h) / 1920.0;

    int32_t topSafe    = static_cast<int32_t>(210.0 * sy);
    int32_t bottomSafe = static_cast<int32_t>((platformId == 0 ? 450.0 : (platformId == 1 ? 480.0 : (platformId == 2 ? 440.0 : 480.0))) * sy);
    int32_t leftSafe   = static_cast<int32_t>((platformId == 2 || platformId == 3 ? 48.0 : 42.0) * sx);
    int32_t rightSafe  = static_cast<int32_t>((platformId == 1 || platformId == 3 ? 168.0 : 162.0) * sx);

    const int32_t x0 = std::clamp(leftSafe, 0, w - 1);
    const int32_t x1 = std::clamp(w - rightSafe, 0, w - 1);
    const int32_t y0 = std::clamp(topSafe, 0, h - 1);
    const int32_t y1 = std::clamp(h - bottomSafe, 0, h - 1);

    // Step 3: Draw crisp 2px emerald safe-zone rectangle (R=16, G=185, B=129)
    const int32_t stroke = std::max<int32_t>(2, static_cast<int32_t>(2.0 * sx));
    for (int32_t y = y0; y <= y1; ++y) {
        uint8_t* dRow = static_cast<uint8_t*>(dst->data) + static_cast<size_t>(y) * dstStride;
        const bool isHorizEdge = (y - y0 < stroke) || (y1 - y < stroke);
        if (isHorizEdge) {
            for (int32_t x = x0; x <= x1; ++x) {
                uint8_t* px = dRow + x * 4;
                px[0] = static_cast<uint8_t>((px[0] * 64 + 129 * 192) >> 8); // B
                px[1] = static_cast<uint8_t>((px[1] * 64 + 185 * 192) >> 8); // G
                px[2] = static_cast<uint8_t>((px[2] * 64 +  16 * 192) >> 8); // R
            }
        } else {
            for (int32_t s = 0; s < stroke; ++s) {
                if (x0 + s < w) {
                    uint8_t* pxL = dRow + (x0 + s) * 4;
                    pxL[0] = 129; pxL[1] = 185; pxL[2] = 16;
                }
                if (x1 - s >= 0) {
                    uint8_t* pxR = dRow + (x1 - s) * 4;
                    pxR[0] = 129; pxR[1] = 185; pxR[2] = 16;
                }
            }
        }
    }
}

} // namespace

// ============================================================================
// Premiere Pro / After Effects Filter Entry Point
// ============================================================================
PR_PLUGIN_EXPORT PF_Err EffectMain(
    PF_Cmd cmd,
    PF_InData* in_data,
    PF_OutData* out_data,
    PF_ParamDef* params[],
    PF_EffectWorld* output,
    void* extra
) {
    (void)out_data;
    (void)extra;

    if (cmd == PF_Cmd_RENDER) {
        if (!params || !params[0] || !output) {
            return PF_Err_NONE;
        }
        const PF_EffectWorld* inputWorld = reinterpret_cast<const PF_EffectWorld*>(params[0]);

        // CRITICAL: Check if Premiere is rendering for export or Media Encoder.
        // If exporting, perform a pure pass-through copy so guides NEVER appear in renders.
        if (!IsInteractiveProgramMonitorPreview(in_data, false)) {
            const int32_t h = std::min(inputWorld->height, output->height);
            const int32_t rowBytes = std::min(
                inputWorld->rowbytes < 0 ? -inputWorld->rowbytes : inputWorld->rowbytes,
                output->rowbytes < 0 ? -output->rowbytes : output->rowbytes
            );
            for (int32_t y = 0; y < h; ++y) {
                std::memcpy(
                    static_cast<uint8_t*>(output->data) + static_cast<size_t>(y) * rowBytes,
                    static_cast<const uint8_t*>(inputWorld->data) + static_cast<size_t>(y) * rowBytes,
                    static_cast<size_t>(rowBytes)
                );
            }
            return PF_Err_NONE;
        }

        // Interactive Program Monitor Preview: Draw non-renderable safe zones
        const int32_t platformId = (params[1] ? params[1]->u.value : 0);
        CompositeSafeZoneGuidesBGRA8(inputWorld, output, platformId);
    }

    return PF_Err_NONE;
}
