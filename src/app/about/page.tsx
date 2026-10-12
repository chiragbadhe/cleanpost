import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  MapPin,
  Camera,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  FileCode,
  AlertTriangle,
} from 'lucide-react';

export const metadata = {
  title: 'About Metadata & AI Provenance — CleanPost',
  description:
    'Deep dive into EXIF tags, GPS location leaks, C2PA Content Credentials, and generative AI indicators in images and videos.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 text-zinc-900 dark:text-zinc-100">
      {/* Page Header */}
      <div className="space-y-3 border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Info className="w-3.5 h-3.5" />
          <span>Educational Guide</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Understanding Digital Metadata & AI Provenance
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          When you snap a photo with an iPhone, edit a video in Premiere, or generate artwork with Stable Diffusion, invisible data is baked directly into the file. Here is what exists, how it tracks you, and how CleanPost protects your anonymity.
        </p>
      </div>

      {/* Section 1: Traditional EXIF & GPS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          <MapPin className="w-5 h-5 text-rose-500" />
          <span>1. EXIF, GPS & Hardware Fingerprinting</span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          EXIF (Exchangeable Image File Format) is an international standard created to store technical camera settings alongside image data. However, modern smartphones and cameras pack sensitive telemetry into these blocks:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
            <strong className="text-rose-500 block">GPS Coordinates (Critical Risk)</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              Smartphones write your exact geographic coordinates (latitude, longitude, and elevation) with accuracy down to a few meters. If you share a photo taken in your bedroom or home backyard, anyone inspecting the EXIF can locate your residence.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
            <strong className="text-amber-500 block">Device Serial Numbers (High Risk)</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              Camera bodies, lenses, and smartphones embed unique hardware serial numbers (e.g. <code>InternalSerialNumber</code>). Intelligence agencies and stalkers use this to correlate different photos from different accounts to the same physical device owner.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
            <strong className="text-blue-500 block">Embedded Mini Thumbnails</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              Many cameras generate a low-resolution thumbnail inside the EXIF IFD1 block. When you crop or blur an image using basic editing apps, the full-size image is modified, but the embedded thumbnail often remains uncropped—leaking the unedited photo.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
            <strong className="text-purple-500 block">Creation & Digitize Timestamps</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              Files record the exact second of capture down to millisecond sub-seconds, alongside local timezone offsets. This exposes your daily schedule and sleep cycles.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: C2PA & Content Credentials */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <span>2. C2PA Content Credentials & AI Provenance</span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          The <strong>Coalition for Content Provenance and Authenticity (C2PA)</strong> is an open technical standard developed by Adobe, Microsoft, Google, Intel, and others. It cryptographically signs files to prove how they were made and whether AI tools were involved.
        </p>

        <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3 text-xs">
          <div className="font-semibold text-purple-700 dark:text-purple-300">
            How C2PA Works Inside Media Containers:
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400 pl-1">
            <li>
              <strong>JUMBF Box:</strong> In JPEG, PNG, and MP4 containers, C2PA embeds a superbox called <code>c2pa</code> or <code>c2pa.manifest</code> containing cryptographic manifests.
            </li>
            <li>
              <strong>Digital Source Type:</strong> IPTC/XMP fields like <code>trainedAlgorithmicMedia</code> or <code>compositeWithTrainedAlgorithmicMedia</code> declare when Adobe Firefly, DALL-E, or Midjourney created or altered an image.
            </li>
            <li>
              <strong>Prompt Snippets:</strong> Tools like Automatic1111, ComfyUI, and InvokeAI write your exact text prompts, negative prompts, seed numbers, and sampler models into PNG <code>tEXt</code> chunks.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3: What Can vs Cannot Be Removed */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          <ShieldAlert className="w-5 h-5 text-emerald-500" />
          <span>3. Technical Transparency: What Can vs Cannot Be Removed</span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          We believe in complete honesty. Beware of any utility claiming it makes photos "100% undetected by all AI algorithms." Here is the objective reality:
        </p>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              What CleanPost CAN Remove:
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              CleanPost strips 100% of embedded EXIF, GPS coordinates, camera serial numbers, embedded thumbnails, editing software tags, PNG prompt chunks (SD/ComfyUI), and C2PA JUMBF container manifests. The output file is clean of all metadata containers.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
            <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              What NO Metadata Cleaner Can Remove:
            </div>
            <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400 pl-1">
              <li>
                <strong>Invisible Latent Watermarks:</strong> Technologies like Google SynthID embed invisible statistical patterns directly into pixel frequencies during model generation. Stripping metadata does not alter these mathematical pixel artifacts.
              </li>
              <li>
                <strong>Platform-Side Labels:</strong> When you upload to TikTok or Instagram, their servers may run proprietary computer-vision models that scan pixel features and add an "AI-generated" tag on their platform interface.
              </li>
              <li>
                <strong>Burned-In Visible Watermarks:</strong> Logos painted onto pixel data cannot be removed through metadata sanitization without generative inpainting.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: What Social Platforms Do */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          <Layers className="w-5 h-5 text-cyan-500" />
          <span>4. What Social Media Platforms Do With Uploaded Media</span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Many users assume Instagram, X, or TikTok protect them because viewer cannot download original EXIF from a post. In reality:
        </p>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
          <p>
            When you tap &quot;Share&quot; in an app, the <strong>unmodified original file</strong> is uploaded to the company&apos;s ingestion ingestion pipeline. Their servers parse and log your coordinates, camera model, and creation times into your user behavioral profile before recompressing the file for public CDN delivery.
          </p>
          <p>
            Sanitizing with CleanPost <strong>before</strong> uploading guarantees that the platform&apos;s servers never receive your private coordinates or device fingerprints in the first place.
          </p>
        </div>
      </section>

      {/* CTA Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 text-center space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Ready to clean your photos and videos?
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Start processing your files with zero logs and zero server retention.
        </p>
        <div>
          <Link
            href="/clean"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-transform hover:scale-105"
          >
            Open Cleaner Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
