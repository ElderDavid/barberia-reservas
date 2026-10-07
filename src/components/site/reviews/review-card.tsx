import { Avatar } from "@/components/site/avatar";
import { Stars } from "@/components/site/reviews/stars";

type Props = {
  author: string;
  rating: number;
  comment: string;
  ownerReply: string | null;
  date: string;
};

/** One customer opinion with the barbershop's answer set in below it, like a conversation. */
export function ReviewCard({ author, rating, comment, ownerReply, date }: Props) {
  return (
    <article className="space-y-3 rounded-card border border-hairline bg-surface p-5">
      <header className="flex items-center gap-3">
        <Avatar name={author} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{author}</p>
          <p className="text-sm text-fg-muted first-letter:uppercase">{date}</p>
        </div>
        <Stars rating={rating} size="sm" />
      </header>
      {comment ? <p className="leading-relaxed">{comment}</p> : null}
      {ownerReply ? (
        <div className="ml-4 border-l-2 border-cocoa pl-4">
          <p className="text-sm font-medium">Respuesta de la barbería</p>
          <p className="mt-1 leading-relaxed text-fg-muted">{ownerReply}</p>
        </div>
      ) : null}
    </article>
  );
}
