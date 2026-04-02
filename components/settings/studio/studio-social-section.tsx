"use client";

import { Input } from "@/components/ui/input";
import { Globe } from "lucide-react";
import type { SocialLinks } from "@/types/settings";

/* ═══════════════════════════════════════════
   Studio Social Section — Social links JSONB fields
   Sub-component of StudioInfoForm
   ═══════════════════════════════════════════ */

interface StudioSocialSectionProps {
  socialLinks: SocialLinks;
  setSocialLinks: (v: SocialLinks) => void;
}

export default function StudioSocialSection({
  socialLinks,
  setSocialLinks,
}: StudioSocialSectionProps) {
  const updateField = (key: keyof SocialLinks, value: string) => {
    setSocialLinks({ ...socialLinks, [key]: value });
  };

  return (
    <section className="card-base p-4 lg:p-6">
      <h3 className="section-heading mb-4">
        <Globe className="w-4 h-4 inline-block mr-1.5 align-middle" />
        Mạng xã hội
      </h3>

      <div className="space-y-3">
        <Input
          id="social-website"
          label="Website"
          value={socialLinks.website || ""}
          onChange={(e) => updateField("website", e.target.value)}
          placeholder="https://moodstudio.vn"
        />
        <div className="form-grid-2col">
          <Input
            id="social-facebook"
            label="Facebook"
            value={socialLinks.facebook || ""}
            onChange={(e) => updateField("facebook", e.target.value)}
            placeholder="facebook.com/moodstudio"
          />
          <Input
            id="social-instagram"
            label="Instagram"
            value={socialLinks.instagram || ""}
            onChange={(e) => updateField("instagram", e.target.value)}
            placeholder="@moodstudio"
          />
        </div>
      </div>
    </section>
  );
}
