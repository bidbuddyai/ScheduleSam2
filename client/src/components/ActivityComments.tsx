import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare, Send, Paperclip, Reply, CheckCircle2,
  Clock, User, AlertCircle, MoreVertical
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { ActivityComment } from "@shared/schema";

interface ActivityCommentsProps {
  activityId: string;
  projectId: string;
  currentUser?: {
    name: string;
    role: string;
  };
}

export default function ActivityComments({ activityId, projectId, currentUser }: ActivityCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default user if not provided
  const user = currentUser || { name: "Current User", role: "Scheduler" };

  // Fetch comments for the activity
  const { data: comments = [], isLoading } = useQuery<ActivityComment[]>({
    queryKey: ['/api/activities', activityId, 'comments'],
    enabled: !!activityId
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          projectId,
          authorName: user.name,
          authorRole: user.role
        })
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId, 'comments'] });
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Resolve comment mutation
  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/comments/${commentId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to resolve comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId, 'comments'] });
      toast({
        title: "Comment Resolved",
        description: "The comment thread has been marked as resolved."
      });
    }
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    addCommentMutation.mutate({ content: replyContent, parentId });
  };

  // Group comments by parent
  const threadedComments = comments.reduce((acc, comment) => {
    if (!comment.parentId) {
      acc.push({
        ...comment,
        replies: comments.filter(c => c.parentId === comment.id)
      });
    }
    return acc;
  }, [] as (ActivityComment & { replies: ActivityComment[] })[]);

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return commentDate.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Comments & Discussion</h3>
          <Badge variant="outline">{threadedComments.length}</Badge>
        </div>
      </div>

      {/* New Comment Input */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Textarea
              placeholder="Add a comment or note about this activity..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
              data-testid="textarea-new-comment"
            />
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600"
                disabled
                data-testid="button-attach-file"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Attach File
              </Button>
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                size="sm"
                data-testid="button-post-comment"
              >
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading comments...</div>
        </div>
      ) : threadedComments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400">Be the first to add a comment or note</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {threadedComments.map((comment) => (
              <Card key={comment.id} className={comment.isResolved ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  {/* Comment Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{comment.authorName}</span>
                          {comment.authorRole && (
                            <Badge variant="secondary" className="text-xs">
                              {comment.authorRole}
                            </Badge>
                          )}
                          {comment.isResolved && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!comment.isResolved && (
                          <DropdownMenuItem
                            onClick={() => resolveCommentMutation.mutate(comment.id)}
                            data-testid={`button-resolve-comment-${comment.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Resolved
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setReplyingTo(comment.id)}
                          data-testid={`button-reply-comment-${comment.id}`}
                        >
                          <Reply className="w-4 h-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Comment Content */}
                  <div className="ml-11">
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    
                    {/* Attachments */}
                    {comment.attachmentIds && comment.attachmentIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {comment.attachmentIds.map((attachmentId) => (
                          <Badge key={attachmentId} variant="outline" className="text-xs">
                            <Paperclip className="w-3 h-3 mr-1" />
                            Attachment
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          className="min-h-[60px]"
                          autoFocus
                          data-testid={`textarea-reply-${comment.id}`}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReply(comment.id)}
                            disabled={!replyContent.trim() || addCommentMutation.isPending}
                            data-testid={`button-send-reply-${comment.id}`}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(reply.authorName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{reply.authorName}</span>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm ml-8 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}