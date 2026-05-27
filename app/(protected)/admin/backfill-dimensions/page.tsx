"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { backfillAllDimensions, backfillGalleryDimensions } from "@/app/actions/gallery-dimensions-actions";
import { Loader2, Image, CheckCircle2, XCircle } from "lucide-react";

export default function BackfillDimensionsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [specificGalleryId, setSpecificGalleryId] = useState("");

  const handleBackfillAll = async () => {
    setLoading(true);
    setResults(null);

    try {
      const result = await backfillAllDimensions();
      setResults(result);
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackfillGallery = async () => {
    if (!specificGalleryId.trim()) {
      alert("Please enter a gallery ID");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const result = await backfillGalleryDimensions(specificGalleryId);
      setResults({ galleries: [{ galleryId: specificGalleryId, ...result }] });
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Backfill Image Dimensions</h1>
        <p className="text-text-muted">
          Populate width/height for existing gallery images to enable Pinterest-style masonry layout.
        </p>
      </div>

      {/* Backfill All */}
      <div className="p-6 mb-6 bg-bg-card border border-border rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Image size={20} />
              Backfill All Galleries
            </h2>
            <p className="text-sm text-text-muted">
              Process up to 10 galleries (100 images each). This may take a few minutes.
            </p>
          </div>
        </div>

        <Button
          onClick={handleBackfillAll}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Processing...
            </>
          ) : (
            "Start Backfill All"
          )}
        </Button>
      </div>

      {/* Backfill Specific Gallery */}
      <div className="p-6 mb-6 bg-bg-card border border-border rounded-lg">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Image size={20} />
          Backfill Specific Gallery
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Gallery ID (UUID)"
            value={specificGalleryId}
            onChange={(e) => setSpecificGalleryId(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg"
            disabled={loading}
          />
          <Button
            onClick={handleBackfillGallery}
            disabled={loading || !specificGalleryId.trim()}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Backfill"
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="p-6 bg-bg-card border border-border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Results</h2>

          {results.error ? (
            <div className="flex items-start gap-3 text-error">
              <XCircle size={20} className="mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{results.error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {results.galleries?.map((gallery: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{gallery.title || gallery.galleryId}</p>
                    <p className="text-sm text-text-muted">
                      Gallery ID: {gallery.galleryId}
                    </p>
                  </div>

                  <div className="text-right">
                    {gallery.success ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 size={16} />
                        <span className="text-sm">
                          {gallery.processed || 0} processed
                          {gallery.failed > 0 && `, ${gallery.failed} failed`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-error">
                        <XCircle size={16} />
                        <span className="text-sm">Failed</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-bg-hover rounded-lg">
        <h3 className="font-semibold mb-2">ℹ️ How it works</h3>
        <ul className="text-sm text-text-muted space-y-1">
          <li>• Fetches images from Google Drive (thumbnail URL)</li>
          <li>• Extracts dimensions using Sharp library</li>
          <li>• Updates width/height in database</li>
          <li>• Rate limited to 150ms per image (~400 images/min)</li>
          <li>• Falls back to 3000x2000 if extraction fails</li>
        </ul>

        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="font-semibold mb-2">🚀 Future uploads</h3>
          <p className="text-sm text-text-muted">
            New galleries automatically backfill dimensions in the background after creation.
            No manual action needed!
          </p>
        </div>
      </div>
    </div>
  );
}
