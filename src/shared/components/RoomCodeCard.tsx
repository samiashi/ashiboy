import { Suspense, lazy, useState } from 'react';
import { m } from 'motion/react';
import { popIn } from '@/anim';
import { INK, PAPER } from '@/shared/theme';

// Split the QR renderer out of the game chunks — it is only needed in the
// lobby, never on the join screen that loads first.
const QRCode = lazy(() => import('react-qr-code'));

interface Props {
  roomCode: string;
  inviteLink: string;
}

/** Room code display with QR invite and copy-to-clipboard. Self-contained. */
export function RoomCodeCard({ roomCode, inviteLink }: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (non-secure context) — the code is visible anyway
    }
  };

  return (
    <m.div className="card card-luxe center" variants={popIn} initial="hidden" animate="show">
      <p className="eyebrow">Room code — share it with everyone</p>
      <p className="big-code" aria-label={`Room code ${roomCode}`}>
        {roomCode}
      </p>
      <div className="qr-box">
        <Suspense fallback={<div className="qr-placeholder" aria-hidden="true" />}>
          <QRCode
            value={inviteLink || 'pending'}
            size={148}
            bgColor={PAPER}
            fgColor={INK}
            aria-label={`Invite QR code for room ${roomCode}`}
          />
        </Suspense>
      </div>
      <button className="btn btn-ghost" onClick={copyLink}>
        {copied ? 'Copied to clipboard!' : 'Copy invite link'}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Invite link copied to clipboard' : ''}
      </span>
    </m.div>
  );
}
