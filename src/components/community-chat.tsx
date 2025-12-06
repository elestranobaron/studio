
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useUser, useFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUp, ArrowDown, MessageSquare, CornerDownRight, Send, LoaderCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from './ui/use-toast';
import { ScrollArea } from './ui/scroll-area';

type MessageWithReplies = Message & { id: string; replies?: MessageWithReplies[] };

function Comment({ message, onReply, onVote, userVote }: { message: MessageWithReplies; onReply: (parentId: string) => void; onVote: (messageId: string, vote: 'up' | 'down') => void; userVote?: 'up' | 'down' }) {
    const { user } = useUser();
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
                        {message.replies.map(reply => (
                            <Comment key={reply.id} message={reply} onReply={onReply} onVote={onVote} userVote={userVote} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function CommunityChat({ wodId }: { wodId: string }) {
    const { firestore, user } = useFirebase();
    const [newMessage, setNewMessage] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});
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

            const messageData: any = {
                text: newMessage,
                userId: user.uid,
                userDisplayName: user.email?.split('@')[0] || 'Anonymous',
                timestamp: serverTimestamp(),
                score: 0,
            };

            if (replyingTo) {
                messageData.parentId = replyingTo;
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

                const currentScore = messageDoc.data().score || 0;
                let newScore = currentScore;
                
                if (userVotes[messageId] === vote) { // Unvoting
                    newScore += vote === 'up' ? -1 : 1;
                    delete userVotes[messageId];
                } else if (userVotes[messageId]) { // Changing vote
                    newScore += vote === 'up' ? 2 : -2;
                    userVotes[messageId] = vote;
                } else { // New vote
                    newScore += vote === 'up' ? 1 : -1;
                    userVotes[messageId] = vote;
                }

                setUserVotes({...userVotes});
                transaction.update(messageRef, { score: newScore });
            });
        } catch (error) {
             toast({ variant: 'destructive', title: "Erreur", description: "Impossible de voter." });
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 -mx-6">
                <div className="px-6 space-y-6">
                    {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="animate-spin" /></div>}
                    {threadedMessages.length === 0 && !isLoading && <p className="text-center text-muted-foreground p-8">Sois le premier à commenter !</p>}
                    {threadedMessages.map(message => (
                        <Comment key={message.id} message={message} onReply={setReplyingTo} onVote={handleVote} userVote={userVotes[message.id]}/>
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
