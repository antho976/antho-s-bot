"use client";

import { isEmptyEmbed, type EmbedInput } from "@/lib/embed";

/** True for a usable image src. */
function isImg(u: string): boolean {
  return /^https?:\/\//i.test(u.trim());
}

/** A rough Discord-style render of the embed so you can see it before posting. */
export function EmbedPreview({ embed }: { embed: EmbedInput }) {
  const shownFields = embed.fields.filter((f) => f.name.trim() || f.value.trim());

  return (
    <div className="rounded-lg bg-[#313338] p-3 text-[13px] leading-snug">
      {embed.content.trim() && (
        <div className="mb-2 whitespace-pre-wrap break-words text-[#dbdee1]">{embed.content}</div>
      )}

      {isEmptyEmbed(embed) ? (
        <div className="text-xs text-[#949ba4]">Your embed preview will appear here.</div>
      ) : (
        <div
          className="max-w-[432px] overflow-hidden rounded"
          style={{ borderLeft: `4px solid ${embed.color || "#4e5058"}`, background: "#2b2d31" }}
        >
          <div className="flex gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              {embed.author.trim() && (
                <div className="mb-1 flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isImg(embed.authorIcon) && (
                    <img src={embed.authorIcon} alt="" className="h-5 w-5 rounded-full object-cover" />
                  )}
                  <span className="text-xs font-semibold text-[#f2f3f5]">{embed.author}</span>
                </div>
              )}

              {embed.title.trim() && (
                <div
                  className={`break-words font-semibold ${embed.url.trim() ? "text-[#00a8fc]" : "text-[#f2f3f5]"}`}
                >
                  {embed.title}
                </div>
              )}

              {embed.description.trim() && (
                <div className="mt-1 whitespace-pre-wrap break-words text-[#dbdee1]">
                  {embed.description}
                </div>
              )}

              {shownFields.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {shownFields.map((f, i) => (
                    <div key={i} className={f.inline ? "" : "col-span-2"}>
                      <div className="break-words text-xs font-semibold text-[#f2f3f5]">
                        {f.name || "​"}
                      </div>
                      <div className="whitespace-pre-wrap break-words text-[#dbdee1]">
                        {f.value || "​"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isImg(embed.imageUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={embed.imageUrl} alt="" className="mt-3 max-h-72 rounded" />
              )}

              {(embed.footer.trim() || embed.timestamp) && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#949ba4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isImg(embed.footerIcon) && (
                    <img src={embed.footerIcon} alt="" className="h-4 w-4 rounded-full object-cover" />
                  )}
                  <span className="break-words">
                    {embed.footer}
                    {embed.footer.trim() && embed.timestamp ? " • " : ""}
                    {embed.timestamp ? "just now" : ""}
                  </span>
                </div>
              )}
            </div>

            {isImg(embed.thumbnailUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={embed.thumbnailUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded object-cover"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
