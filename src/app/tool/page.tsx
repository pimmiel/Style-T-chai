import ColorMatcher from "@/components/ColorMatcher";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { getLang, getT } from "@/lib/i18n";

export const metadata = { title: "Style T-chai — Color Matcher" };

export default async function ToolPage() {
  const lang = await getLang();
  const t = getT(lang);

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 pt-12 pb-24">
      <div className="text-center mb-12 space-y-3">
        <Eyebrow>{t.tool.eyebrow}</Eyebrow>
        <DisplayHeading as="h1" className="text-4xl lg:text-5xl">
          {t.tool.headingLine1} <em>{t.tool.headingEmphasis}</em>
        </DisplayHeading>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          {t.tool.desc}
        </p>
      </div>
      <ColorMatcher />
    </div>
  );
}
