import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Users, Check, X } from "lucide-react";
import { ArrowLeft, SearchGlyph, NotificationGlyph } from "@/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { PremiumCrown } from "@/components/ui/PremiumCrown";

interface AddFriendModalProps {
  onClose: () => void;
}

export default function AddFriendModal({ onClose }: AddFriendModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "requests">("search");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search users query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/friends/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        return [];
      }
      const response = await apiRequest(
        "GET",
        `/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      if (!response.ok) {
        throw new Error("Failed to search users");
      }
      const data = await response.json();
      return data.users || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });

  // Fetch friend requests received — polled (not gated to the Requests tab, same reasoning
  // as friends.tsx's friends query) so an incoming request shows up here, and on the
  // Requests tab's badge count, without leaving/reopening this page.
  const { data: friendRequestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/friends/requests"],
    refetchInterval: 15000,
  });

  const friendRequests = (friendRequestsData as any)?.requests || [];

  // Send friend request mutation
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("POST", "/api/friends/request", { recipientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      onClose();
    },
    onError: (error: any) => {
      // Handle CSRF errors specifically
      if (error.message?.includes("CSRF token validation failed") || error.message?.includes("403")) {
        toast({
          title: "Session expired",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send friend request",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Accept friend request mutation — removes the request from the cache directly (rather
  // than invalidateQueries, which waits on a refetch) so the row's exit animation starts
  // the instant the server confirms instead of the row snapping away once a later refetch
  // catches up. See friends.tsx's removeFriendMutation for the same fix on friend removal.
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (requesterId: string) => {
      return await apiRequest("POST", "/api/friends/accept", { requesterId });
    },
    onSuccess: (_, requesterId) => {
      queryClient.setQueryData<any>(["/api/friends/requests"], (old: any) => ({
        ...old,
        requests: (old?.requests || []).filter((r: any) => r.requesterId !== requesterId),
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: any) => {
      // Handle CSRF errors specifically
      if (error.message?.includes("CSRF token validation failed") || error.message?.includes("403")) {
        toast({
          title: "Session expired",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to accept friend request",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Reject friend request mutation — same direct cache removal as accept above.
  const rejectFriendRequestMutation = useMutation({
    mutationFn: async (requesterId: string) => {
      return await apiRequest("POST", "/api/friends/reject", { requesterId });
    },
    onSuccess: (_, requesterId) => {
      queryClient.setQueryData<any>(["/api/friends/requests"], (old: any) => ({
        ...old,
        requests: (old?.requests || []).filter((r: any) => r.requesterId !== requesterId),
      }));
    },
    onError: (error: any) => {
      // Handle CSRF errors specifically
      if (error.message?.includes("CSRF token validation failed") || error.message?.includes("403")) {
        toast({
          title: "Session expired",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to reject friend request",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSendRequest = (recipientId: string) => {
    sendFriendRequestMutation.mutate(recipientId);
  };

  const handleAcceptRequest = (requesterId: string) => {
    acceptFriendRequestMutation.mutate(requesterId);
  };

  const handleRejectRequest = (requesterId: string) => {
    rejectFriendRequestMutation.mutate(requesterId);
  };

  return (
    // h-full, not min-h-screen: the caller's own fixed-safe-screen wrapper is exactly one
    // viewport tall with overflow:hidden (see friends.tsx/profile.tsx) — min-h-screen let this
    // grow past that and get clipped instead of properly containing itself, and (before that
    // wrapper's own overflow was fixed) was part of what let the whole page drag/bounce as an
    // extra scroll container on top of the search results/requests list's own scrolling below.
    <div className="h-full flex flex-col bg-ink text-white">
      {/* Header — same back-button/title layout as Friends' own page (see friends.tsx). */}
      <header className="px-6 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          {/* Plain button, no hover: — same size as Avatars' back arrow (see
              avatars.tsx), and no hover background: shadcn Button's ghost variant
              painted a gray square on tap because iOS WebView triggers :hover on tap. */}
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Add Friend</h1>
          <div className="w-10 h-10" />
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 px-6 pb-6 space-y-6">
      {/* Tab Navigation — same rounded-xl radius as Friends' "Add friend" button, sized
          up from the original px-4/py-2 pill (h-12) to actually read at that radius
          instead of looking closer to fully rounded. The white background is a single
          shared-layout pill (layoutId) that slides between whichever button is active
          instead of the two buttons each snapping their own bg on/off. */}
      <div className="flex bg-white/5 rounded-2xl p-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab("search")}
          className={`relative flex-1 flex items-center justify-center gap-2 px-4 h-12 rounded-xl transition-colors ${activeTab === "search"
              ? "text-[#15161A]"
              : "text-white/70 hover:text-white"
            }`}
          data-testid="tab-search"
        >
          {activeTab === "search" && (
            <motion.div
              layoutId="add-friend-tab-pill"
              className="absolute inset-0 bg-white rounded-xl"
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            />
          )}
          <span className="relative z-10">Search Friends</span>
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`relative flex-1 flex items-center justify-center gap-2 px-4 h-12 rounded-xl transition-colors ${activeTab === "requests"
              ? "text-[#15161A]"
              : "text-white/70 hover:text-white"
            }`}
          data-testid="tab-requests"
        >
          {activeTab === "requests" && (
            <motion.div
              layoutId="add-friend-tab-pill"
              className="absolute inset-0 bg-white rounded-xl"
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            />
          )}
          <span className="relative z-10">Requests</span>
          {friendRequests.length > 0 && (
            <span className="relative z-10 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
              {friendRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content — both branches fill the remaining page height (flex-1 min-h-0,
          this is a full page now rather than a fixed-size popup); the Search tab has
          extra header content (input + hint) the Requests tab doesn't, so the list
          itself is flex-1 within that rather than a fixed height. */}
      {activeTab === "search" ? (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl"
              data-testid="input-search-friends"
            />
          </div>

          {/* Search Results — flex-1 fills whatever height the input/hint above leave */}
          <div className="relative flex-1 min-h-0 overflow-y-auto">
            {searchQuery.trim().length < 2 ? (
              // absolute inset-0 instead of an h-full child — centers reliably in the
              // space between the input and the bottom of the screen regardless of how
              // this flex-1 container's own height resolves, rather than depending on a
              // percentage-height child staying in sync with it.
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 -translate-y-16 text-center">
                <SearchGlyph className="w-32 h-32 text-[#232328]" />
                <p className="text-white/70">Enter at least 2 characters to search</p>
              </div>
            ) : isSearching ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="w-20 h-4 bg-white/10 rounded mb-2 animate-pulse" />
                        <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
                      </div>
                      <div className="w-16 h-8 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-white/50" />
                </div>
                <p className="text-white/70">User not found</p>
                <p className="text-white/50 text-sm">Check the spelling and try again</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((user: any, index: number) => {
                  const avatar = user.selectedAvatarId ?
                    getAvatarById(user.selectedAvatarId) :
                    getDefaultAvatar();

                  return (
                    <motion.div
                      key={user.id}
                      className="p-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      data-testid={`search-result-${user.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {avatar?.image ? (
                            <img
                              src={avatar.image}
                              alt={`${user.username} avatar`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-white flex items-center justify-center">
                              <span className="text-[#15161A] text-sm font-bold">
                                {user.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-white font-semibold truncate" data-testid={`user-username-${user.id}`}>
                              {user.username}
                            </p>
                            {user.membershipType === 'premium' && (
                              <PremiumCrown size={14} />
                            )}
                          </div>
                          <p className="text-white/50 text-xs">Level {user.level || 1}</p>
                        </div>

                        {/* Friendship Status & Actions */}
                        <div className="flex-shrink-0">
                          {user.friendshipStatus === 'friends' ? (
                            <div className="flex items-center space-x-2 text-green-400">
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Friends</span>
                            </div>
                          ) : user.friendshipStatus === 'pending_sent' ? (
                            <div className="flex items-center space-x-2 text-yellow-400">
                              <X className="w-4 h-4" />
                              <span className="text-sm">Pending</span>
                            </div>
                          ) : user.friendshipStatus === 'pending_received' ? (
                            <div className="flex items-center space-x-2 text-white">
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Accept</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSendRequest(user.id)}
                              disabled={sendFriendRequestMutation.isPending}
                              // Visual match for Battle Pass's "Unlock premium rewards"
                              // (rounded-xl, 12px, on a ~60px-tall button) scaled down to
                              // this h-9 (36px) button — corner radius doesn't scale
                              // linearly with size (the straight-scaled 7px, rounded-lg,
                              // reads as noticeably squarer at this size), so 10px lands
                              // closer to an equivalent roundedness than either standard
                              // step on either side of it.
                              className="bg-white hover:bg-white/90 text-[#15161A] rounded-[10px]"
                              data-testid={`button-add-friend-${user.id}`}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Friend Requests — flex-1 fills the same page height as the Search tab,
              since there's no input/hint header here to share that height with */}
          <div className="relative flex-1 min-h-0 overflow-y-auto">
            {isLoadingRequests ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="w-20 h-4 bg-white/10 rounded mb-2 animate-pulse" />
                        <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
                      </div>
                      <div className="w-20 h-8 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friendRequests.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 -translate-y-16 text-center">
                <NotificationGlyph className="w-32 h-32 text-[#232328]" />
                <div>
                  <p className="text-white/70">No friend requests</p>
                  <p className="text-white/50 text-sm">You'll see new friend requests here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* AnimatePresence + layout, same fix as friends.tsx's removeFriendMutation:
                    accept/reject now remove the request from the cache directly instead of
                    invalidateQueries, so this exit (slide right + fade) actually plays, and
                    the rows below slide smoothly into the gap instead of snapping up. */}
                <AnimatePresence initial={false}>
                {friendRequests.map((request: any, index: number) => {
                  const avatar = request.requester?.selectedAvatarId ?
                    getAvatarById(request.requester.selectedAvatarId) :
                    getDefaultAvatar();

                  return (
                    <motion.div
                      key={request.id}
                      layout
                      className="p-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 300, transition: { duration: 0.3, ease: "easeOut" } }}
                      transition={{ delay: index * 0.1, layout: { duration: 0.3, ease: "easeOut" } }}
                      data-testid={`friend-request-${request.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {avatar?.image ? (
                            <img
                              src={avatar.image}
                              alt={`${request.requester?.username} avatar`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-white flex items-center justify-center">
                              <span className="text-[#15161A] text-sm font-bold">
                                {(request.requester?.username || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-white font-semibold truncate" data-testid={`request-username-${request.id}`}>
                              {request.requester?.username || 'Unknown'}
                            </p>
                            {request.requester?.membershipType === 'premium' && (
                              <PremiumCrown size={14} />
                            )}
                          </div>
                          <p className="text-white/50 text-xs">Wants to be your friend</p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(request.requesterId)}
                            disabled={acceptFriendRequestMutation.isPending}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 transition-transform active:scale-90 disabled:opacity-50"
                            data-testid={`button-accept-${request.id}`}
                          >
                            <Check className="w-5 h-5" strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.requesterId)}
                            disabled={rejectFriendRequestMutation.isPending}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 transition-transform active:scale-90 disabled:opacity-50"
                            data-testid={`button-reject-${request.id}`}
                          >
                            <X className="w-5 h-5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}