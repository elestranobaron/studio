/// <reference types="react" />

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useUser, useFirebase } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch, serverTimestamp, runTransaction, increment, getDoc } from 'firebase/firestore';
import type { Message, Reaction, WOD } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUp, ArrowDown, MessageSquare, Send, LoaderCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from './ui/use-toast';
import { ScrollArea } from './ui/scroll-area';

type MessageWithReplies = Message & { id: string; replies?: MessageWithReplies[] };

function Comment({ message, onReply, onVote, userVote }: { message: MessageWithReplies; onReply: (parentId: string) => void; onVote: (messageId: string, vote: 'up' | 'down') => void; userVote?: 'up' | 'down' }) {
    const [isReplying, setIsReplying] = useState(false);

    const handleReplyClick = () => {
        setIsReplying(!isReplying);
        if (!isReplying) onReply(message.id);
    }
    
    return (
        <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
                <AvatarFallback>{message.userDisplayName?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">{message.userDisplayName}</span>
                    <span className="text-muted-foreground">· {message.timestamp ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true, locale: fr }) : '...'}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onVote(message.id, 'up')}>
                             <ArrowUp className={cn("h-4 w-4", userVote === 'up' && "text-primary fill-primary")} />
                         </Button>
                         <span className="font-bold tabular-nums">{message.score ?? 0}</span>
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onVote(message.id, 'down')}>
                            <ArrowDown className={cn("h-4 w-4", userVote === 'down' && "text-destructive fill-destructive")} />
                         </Button>
                    </div>
                     <Button variant="ghost" size="sm" className="h-6 gap-1" onClick={handleReplyClick}>
                         <MessageSquare className="h-3 w-3"/>
                         <span>Répondre</span>
                     </Button>
                </div>

                {message.replies && message.replies.length > 0 && (
                    <div className="pt-2 space-y-4">
                        {message.replies.map((reply: MessageWithReplies) => (
                            <Comment key={reply.id} message={reply} onReply={onReply} onVote={onVote} userVote={userVote} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ReactionGrid({ initialWod }: { initialWod: WOD }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [wod, setWod] = useState(initialWod);
    const [userReaction, setUserReaction] = useState<Reaction | null>(null);

    const reactorRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `communityWods/${wod.id}/reactors/${user.uid}`);
    }, [firestore, user, wod.id]);

    useEffect(() => {
        if (!reactorRef) return;
        getDoc(reactorRef).then(docSnap => {
            if (docSnap.exists()) {
                setUserReaction(docSnap.data().type as Reaction);
            }
        });
    }, [reactorRef]);


    const reactionsConfig: { type: Reaction; emoji: string; tooltip: string }[] = [
        { type: "fire", emoji: "🔥", tooltip: "Awesome!" },
        { type: "cry", emoji: "😭", tooltip: "I cried" },
        { type: "vomit", emoji: "🤮", tooltip: "Puked" },
        { type: "laugh", emoji: "😂", tooltip: "Funny WOD" },
        { type: "poop", emoji: "💩", tooltip: "That was crap" },
    ];
    
    if (!firestore || !user) {
        return null;
    }
    
    const handleReaction = async (e: React.MouseEvent, reactionType: Reaction) => {
        e.preventDefault();
        e.stopPropagation();

        if (!reactorRef) return;

        const originalWod = { ...wod };
        const originalReaction = userReaction;

        setWod((currentWod: WOD) => {
            const newReactions = { ...(currentWod.reactions || { fire: 0, poop: 0, laugh: 0, cry: 0, vomit: 0 }) };
            if (userReaction === reactionType) {
                newReactions[reactionType]--;
                setUserReaction(null);
            } else {
                if (userReaction) newReactions[userReaction]--;
                newReactions[reactionType]++;
                setUserReaction(reactionType);
            }
            return { ...currentWod, reactions: newReactions };
        });

        const communityWodRef = doc(firestore, "communityWods", wod.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                const reactionDoc = await transaction.get(reactorRef);
                const wodDoc = await transaction.get(communityWodRef);

                if (!wodDoc.exists()) throw "WOD does not exist!";

                const currentReactions = wodDoc.data().reactions || { fire: 0, poop: 0, laugh: 0, cry: 0, vomit: 0 };
                const newReactions = { ...currentReactions };

                if (reactionDoc.exists()) {
                    const previousReaction = reactionDoc.data().type as Reaction;
                    if (previousReaction === reactionType) {
                        newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1);
                        transaction.delete(reactorRef);
                    } else {
                        newReactions[previousReaction] = Math.max(0, newReactions[previousReaction] - 1);
                        newReactions[reactionType]++;
                        transaction.set(reactorRef, { type: reactionType });
                    }
                } else {
                    newReactions[reactionType]++;
                    transaction.set(reactorRef, { type: reactionType });
                }
                transaction.update(communityWodRef, { reactions: newReactions });
            });
        } catch (error) {
             toast({ variant: "destructive", title: "Erreur", description: "Impossible de voter." });
            setWod(originalWod);
            setUserReaction(originalReaction);
        }
    };
    
    const totalReactions = Object.values(wod.reactions || {}).reduce((a: number, b: number) => a + b, 0);

    return (
      <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
              {reactionsConfig.map(({ type, emoji }) => {
                  const count = wod.reactions?.[type] ?? 0;
                  if (count > 0) {
                      return (
                          <div key={type} className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                              {emoji}
                          </div>
                      )
                  }
                  return null;
              })}
               {totalReactions > 0 && <div className="h-6 px-2 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold tabular-nums text-muted-foreground z-10">
                  {totalReactions}
              </div>}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
               {reactionsConfig.map(({ type, emoji }) => (
                   <button
                       key={type}
                       className={cn(
                           "h-7 w-7 rounded-full text-base flex items-center justify-center transition-all",
                           userReaction === type ? "bg-background scale-110 shadow" : "hover:bg-background/50"
                       )}
                       onClick={(e) => handleReaction(e, type)}
                   >
                       {emoji}
                   </button>
               ))}
          </div>
      </div>
    );
}


export function CommunityChat({ wodId }: { wodId: string }) {
    const { firestore, user } = useFirebase();
    const [newMessage, setNewMessage] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const { toast } = useToast();

    const messagesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, `communityWods/${wodId}/messages`), orderBy('score', 'desc'), orderBy('timestamp', 'desc'));
    }, [firestore, wodId]);

    const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
    
    const threadedMessages = useMemo(() => {
        if (!messages) return [];
        const messageMap = new Map<string, MessageWithReplies>();
        const rootMessages: MessageWithReplies[] = [];

        messages.forEach(msg => messageMap.set(msg.id, { ...msg, replies: [] }));

        messages.forEach(msg => {
            if (msg.parentId && messageMap.has(msg.parentId)) {
                messageMap.get(msg.parentId)!.replies!.push(messageMap.get(msg.id)!);
            } else {
                rootMessages.push(messageMap.get(msg.id)!);
            }
        });

        return rootMessages;
    }, [messages]);


    const handlePostMessage = async () => {
        if (!firestore || !user || !newMessage.trim()) return;
        setIsPosting(true);
        try {
            const batch = writeBatch(firestore);
            const messageCol = collection(firestore, `communityWods/${wodId}/messages`);
            const messageRef = doc(messageCol);

            const messageData: Omit<Message, 'id'> = {
                text: newMessage,
                userId: user.uid,
                userDisplayName: user.email?.split('@')[0] || 'Anonymous',
                timestamp: serverTimestamp() as any, // Firestore will convert this
                score: 0,
                upvotes: 0,
                downvotes: 0,
                replyCount: 0,
                parentId: replyingTo || null,
            };

            if (replyingTo) {
                const parentRef = doc(messageCol, replyingTo);
                batch.update(parentRef, { replyCount: increment(1) });
            }

            batch.set(messageRef, messageData);

            await batch.commit();
            setNewMessage('');
            setReplyingTo(null);

        } catch (error) {
            console.error("Error posting message:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de poster le message." });
        } finally {
            setIsPosting(false);
        }
    };
    
    const handleVote = async (messageId: string, vote: 'up' | 'down') => {
        if (!firestore || !user) return;
        
        const messageRef = doc(firestore, `communityWods/${wodId}/messages`, messageId);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const messageDoc = await transaction.get(messageRef);
                if (!messageDoc.exists()) throw "Message not found";

                // This part would need user-specific vote tracking, which is complex.
                // For now, we'll just increment/decrement score.
                const newScore = (messageDoc.data().score || 0) + (vote === 'up' ? 1 : -1);
                transaction.update(messageRef, { score: newScore });
            });
        } catch (error) {
             toast({ variant: 'destructive', title: "Erreur", description: "Impossible de voter." });
        }
    };

    if (!user) {
        return <div className="text-center text-muted-foreground p-8">Connectez-vous pour rejoindre la discussion.</div>
    }

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 -mx-6">
                <div className="px-6 space-y-6">
                    {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="animate-spin" /></div>}
                    {threadedMessages.length === 0 && !isLoading && <p className="text-center text-muted-foreground p-8">Sois le premier à commenter !</p>}
                    {threadedMessages.map((message: MessageWithReplies) => (
                        <Comment key={message.id} message={message} onReply={setReplyingTo} onVote={handleVote} />
                    ))}
                </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t">
                {replyingTo && (
                    <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center">
                        <span>Répondre à <span className="font-semibold">{messages?.find(m=>m.id === replyingTo)?.userDisplayName}</span></span>
                        <Button variant="ghost" size="sm" className="h-auto px-2 py-1" onClick={() => setReplyingTo(null)}>Annuler</Button>
                    </div>
                )}
                 <div className="relative">
                    <Textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Ajouter un commentaire..."
                        className="pr-12"
                        maxLength={280}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handlePostMessage();
                            }
                        }}
                    />
                    <Button
                        size="icon"
                        className="absolute right-2 bottom-2 h-8 w-8"
                        onClick={handlePostMessage}
                        disabled={isPosting || !newMessage.trim()}
                    >
                        {isPosting ? <LoaderCircle className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
