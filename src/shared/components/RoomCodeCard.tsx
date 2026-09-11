import { useState } from 'react';
import { m } from 'motion/react';
import QRCode from 'react-qr-code';
import { popIn } from '@/anim';
import { INK, PAPER } from '@/shared/theme';

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
      <p className="big-code">{roomCode}</p>
      <div className="qr-box">
        <QRCode value={inviteLink} size={148} bgColor={PAPER} fgColor={INK} />
      </div>
      <button className="btn btn-ghost" onClick={copyLink}>
        {copied ? 'Copied to clipboard!' : 'Copy invite link'}
      </button>
    </m.div>
  );
}
