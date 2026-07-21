export type NotificationType =
  | "post_liked"
  | "user_followed"
  | "group_joined"
  | "group_outfit_voted"
  | "group_invite_received";

export interface PostLikedPayload        { postId: string; postCaption?: string | null }
export type UserFollowedPayload          = Record<string, never>
export interface GroupJoinedPayload      { groupId: string; groupName: string }
export interface GroupOutfitVotedPayload { groupId: string; outfitId: string }
export interface GroupInvitePayload      { groupId: string; groupName: string }

export type Notification =
  | { id: string; user_id: string; actor_id: string | null; type: "post_liked";           payload: PostLikedPayload;        read: boolean; created_at: string }
  | { id: string; user_id: string; actor_id: string | null; type: "user_followed";         payload: UserFollowedPayload;     read: boolean; created_at: string }
  | { id: string; user_id: string; actor_id: string | null; type: "group_joined";          payload: GroupJoinedPayload;      read: boolean; created_at: string }
  | { id: string; user_id: string; actor_id: string | null; type: "group_outfit_voted";    payload: GroupOutfitVotedPayload; read: boolean; created_at: string }
  | { id: string; user_id: string; actor_id: string | null; type: "group_invite_received"; payload: GroupInvitePayload;      read: boolean; created_at: string };

export type CreateNotificationInput =
  | { userId: string; actorId: string;  type: "post_liked";           payload: PostLikedPayload }
  | { userId: string; actorId: string;  type: "user_followed";         payload: UserFollowedPayload }
  | { userId: string; actorId: string;  type: "group_joined";          payload: GroupJoinedPayload }
  | { userId: string; actorId: string;  type: "group_outfit_voted";    payload: GroupOutfitVotedPayload }
  | { userId: string; actorId?: string; type: "group_invite_received"; payload: GroupInvitePayload };
