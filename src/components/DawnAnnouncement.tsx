/**
 * DawnAnnouncement — 黎明公告（昨夜死亡名單或平安夜）
 */

interface DawnAnnouncementProps {
  dawnDeaths: Array<{ seat: number; name: string }>;
  onDismiss: () => void;
}

export function DawnAnnouncement({ dawnDeaths, onDismiss }: DawnAnnouncementProps) {
  return (
    <div
      className="dawn-announcement"
      style={{
        backgroundColor: dawnDeaths.length > 0 ? '#f8d7da' : '#d4edda',
        border: `2px solid ${dawnDeaths.length > 0 ? '#f5c6cb' : '#c3e6cb'}`,
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        {dawnDeaths.length > 0 ? (
          <>
            <strong style={{ color: '#721c24' }}>昨夜死亡：</strong>
            <span style={{ color: '#721c24' }}>
              {dawnDeaths.map((p) => `${p.seat}號 ${p.name}`).join('、')}
            </span>
          </>
        ) : (
          <strong style={{ color: '#155724' }}>昨夜平安，無人死亡</strong>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.1rem',
          color: dawnDeaths.length > 0 ? '#721c24' : '#155724',
          padding: '0 0.25rem',
        }}
        aria-label="關閉公告"
      >
        ✕
      </button>
    </div>
  );
}
