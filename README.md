# CleanPost — Privacy-First Metadata & AI Provenance Cleaner

> **Sanitize your photos and videos before uploading to Instagram, X, TikTok, LinkedIn, and Facebook.**  
> Strips sensitive EXIF, exact GPS coordinates, camera serial numbers, and C2PA / Generative AI provenance manifests. Zero server retention.

---

## 🌟 Overview

When you snap a photo with an iPhone, edit a video in Premiere, or generate artwork using Stable Diffusion or Midjourney, invisible data is baked directly into the file container:
- **Exact GPS Coordinates:** Exposes your home, workplace, or private locations down to the meter.
- **Hardware Serial Numbers:** Camera and lens serials that track your identity across anonymous accounts.
- **C2PA Content Credentials & AI Prompts:** Cryptographic JUMBF manifests, node graphs, and prompt parameters.
- **Embedded Mini-Thumbnails:** Pre-rendered previews that can leak uncropped or unblurred photos.

**CleanPost** cleans all of this in seconds with a high-integrity, zero-retention pipeline powered by **Sharp**, **FFmpeg**, and **ExifTool**.

---

## 🚀 Key Features

### 1. Dual Inspection & Deep Scanning
- **EXIF & Camera Hardware:** Body make, model, lens, serial numbers, firmware version.
- **GPS Coordinates & Map Visualizer:** Latitude, longitude, altitude, and direction with one-click Google Maps verification.
- **AI Provenance & C2PA Detection:** Scans for C2PA JUMBF container manifests, XMP `digitalSourceType` declarations, and embedded text prompts (Stable Diffusion / Automatic1111 / ComfyUI / Midjourney).
- **Audit Findings & Privacy Risk Score:** Assigns ratings (`Low`, `Medium`, `High`, `Critical`) with explicit explanations.

### 2. High-Fidelity Selective & "Clean All" Sanitization
- **Clean All Preset:** 1-click removal of all privacy-invasive metadata while preserving visual quality and orientation.
- **Selective Toggles:** Pick exactly what to remove (EXIF, GPS, Timestamps, Software history, XMP/IPTC, Thumbnails, AI Prompts).
- **Orientation Preservation:** Automatically rotates photos based on EXIF before stripping orientation tags.
- **Video Cleaning:** Lossless container stream-copying (`-map 0 -c copy -map_metadata -1`) or visually lossless re-encoding (`H.264/AAC` or `VP9/Opus`).

### 3. Ephemeral Batch Processing & ZIP Export
- Drag-and-drop batch upload supporting **JPG, PNG, WebP, HEIC, MP4, MOV, and WebM**.
- Process individually or batch clean the entire queue.
- One-click **ZIP Archive export** (`cleanpost_batch_*.zip`).
- Ephemeral download links that auto-purge after 15 minutes.

### 4. Honest Privacy & AI Disclosures
- Complete transparency: distinguishes between metadata headers (which CleanPost strips 100%) and latent pixel watermarks / server-side platform labels (which cannot be stripped by any metadata tool).

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS with dark & light theme modes
- **Icons:** Lucide React
- **Image Pipeline:** Sharp (high-performance libvips wrapper)
- **Video Pipeline:** FFmpeg (native binary via `child_process`)
- **Metadata Inspection:** ExifTool (`exiftool-vendored` + direct binary buffer scanning)
- **Archive Generation:** JSZip
- **Validation:** Zod schemas
- **Testing:** Vitest

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+ (Node.js 22 recommended)
- `ffmpeg` installed on your system (`brew install ffmpeg` on macOS, or `apt install ffmpeg` on Linux)
- `exiftool` installed on your system (`brew install exiftool` on macOS, or `apt install libimage-exiftool-perl` on Linux)

### Installation
```bash
# 1. Clone repository
git clone https://github.com/your-username/cleanpost.git
cd cleanpost

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Copy environment configuration
cp .env.example .env.local

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access CleanPost.

---

## 🧪 Testing

CleanPost includes unit tests for metadata inspection and cleaning, and integration tests for video container sanitization:

```bash
# Run test suite
npm test
```

Test coverage includes:
- Format signature detection (magic bytes)
- EXIF, GPS, and timestamp detection
- C2PA JUMBF and Generative AI prompt scanning
- Image stripping with Sharp
- MP4 metadata atom scrubbing with FFmpeg

---

## 📡 API Endpoints

### `POST /api/metadata/inspect`
Scans uploaded media and returns a comprehensive metadata summary.
- **Body:** `FormData` with `file` (Binary)
- **Response:** JSON with `FileMetadataSummary`

### `POST /api/metadata/clean`
Cleans uploaded media according to specified options.
- **Body:** `FormData` with `file` (Binary) and optional `options` (JSON string)
- **Response:** JSON with `CleanedFileResult` and ephemeral `downloadUrl`

### `POST /api/metadata/batch`
Cleans multiple media files in a batch queue.
- **Body:** `FormData` with `files` (Binary array) and optional `options` (JSON string)
- **Response:** JSON with `BatchProcessingResponse`

### `POST /api/download/zip`
Bundles completed cleaned files into a ZIP archive.
- **Body:** `{ "fileIds": ["..."] }`
- **Response:** `application/zip` binary stream

### `GET /api/health`
Health check returning statuses of Sharp, ExifTool, and FFmpeg engines.
- **Response:** JSON with engine versions and privacy guarantees

---

## 🐳 Docker Deployment

A production-ready multi-stage Dockerfile is included, bundling `ffmpeg`, `exiftool`, and `libvips`:

```bash
# Build Docker image
docker build -t cleanpost:latest .

# Run container
docker run -p 3000:3000 --rm --name cleanpost cleanpost:latest
```

The container runs as an unprivileged non-root user (`nextjs:nodejs`) with transient `/tmp/cleanpost` scratch storage.

---

## 🔒 Security & Privacy Guarantees

1. **Zero Data Retention:** No databases, no storage buckets, no logs of file contents.
2. **No Third-Party AI APIs:** Processing is executed entirely on local binaries. Files are never transmitted to external AI APIs.
3. **MIME Magic Byte Verification:** Files are verified by binary signature before processing to mitigate malformed payload attacks.
4. **Path Traversal Protection:** Filenames are sanitized and processed in UUID-isolated temporary directories.
5. **Secure Headers:** `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` are strictly enforced.

---

## 📄 License
MIT License. Built for public privacy and digital rights.
# cleanpost
