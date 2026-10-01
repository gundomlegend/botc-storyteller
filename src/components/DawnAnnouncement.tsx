/**
 * DawnAnnouncement — 黎明公告（昨夜死亡名單或平安夜）
 */

interface DawnAnnouncementProps {
  dawnDeaths: Array<{ seat: number; name: string }>;
  onDismiss: () => void;
}

export function DawnAnnouncement({ dawnDeaths, onDismiss }: DawnAnnouncementProps) {
  const hasDeaths = dawnDeaths.length > 0;
  const tone = hasDeaths
    ? 'bg-alert-danger-surface border-alert-danger-border'
    : 'bg-alert-success-surface border-alert-success-border';
  const textTone = hasDeaths ? 'text-alert-danger-text' : 'text-alert-success-text';

  return (
    <div className={`${tone} border-2 py-3 px-4 rounded-lg mb-4 flex items-center justify-between`}>
      <div>
        {hasDeaths ? (
          <>
            <strong className={textTone}>昨夜死亡：</strong>
            <span className={textTone}>
              {dawnDeaths.map((p) => `${p.seat}號 ${p.name}`).join('、')}
            </span>
          </>
        ) : (
          <strong className={textTone}>昨夜平安，無人死亡</strong>
        )}
      </div>
      <button
        onClick={onDismiss}
        className={`bg-none bg-transparent border-none cursor-pointer text-lg ${textTone} py-0 px-1`}
        aria-label="關閉公告"
      >
        ✕
      </button>
    </div>
  );
}
