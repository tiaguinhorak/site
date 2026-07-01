"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Gift,
  Loader2,
  Search,
  Swords,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { ProfileDisplayName } from "@/components/profile/profile-display-name";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCountryFlag } from "@/lib/profile";
import { useUser } from "@/lib/hooks/use-user";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { dispatchInventoryRefresh } from "@/lib/inventory/inventory-refresh-events";
import { cn } from "@/lib/utils";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  useRankedParty,
  RANKED_TEAM_SIZE,
} from "@/components/providers/ranked-party-provider";

type FriendUser = {
  id: string;
  nickname: string;
  displayName: string;
  country: string;
  avatarUrl: string | null;
  plan: string;
  level: number;
  elo: number;
  customization: PublicProfileCustomization | null;
};

type FriendEntry = FriendUser & { friendshipId: string };

type FriendRequestView = {
  friendshipId: string;
  user: FriendUser;
  createdAt: string;
};

type SearchedUser = FriendUser & {
  relationship: "none" | "friends" | "incoming" | "outgoing";
};

type StoreItemLite = {
  id: string;
  name: string;
  coinPrice: number | null;
  canBuyWithCoins: boolean;
  productKind: string;
};

type Tab = "friends" | "requests" | "add";

function Avatar({ user, size = 40 }: { user: FriendUser; size?: number }) {
  const avatarSize = size <= 32 ? "sm" : size <= 44 ? "md" : "lg";
  return (
    <UserProfileAvatar
      avatarUrl={user.avatarUrl}
      nickname={user.nickname}
      customization={user.customization}
      size={avatarSize}
    />
  );
}

export function FriendsSection() {
  const t = useTranslations("friends");
  const tInvite = useTranslations("ranked.inviteJoin");
  const { party } = useRankedParty();
  const { refresh } = useUser();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestView[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [giftTarget, setGiftTarget] = useState<FriendUser | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/friends", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        setFriends(d.friends ?? []);
        setIncoming(d.incoming ?? []);
        setOutgoing(d.outgoing ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function action(path: string, body: Record<string, unknown>, msg?: string) {
    if (busy) return false;
    setBusy(true);
    const result = await secureApi(path, { method: "POST", json: body });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    if (msg) toast.success(msg);
    load();
    return true;
  }

  function openGift(user: FriendUser) {
    setGiftTarget(user);
    setGiftOpen(true);
  }

  const canInviteToRanked =
    Boolean(party?.isLeader) &&
    party!.memberCount < RANKED_TEAM_SIZE &&
    Boolean(party!.inviteCode);

  async function inviteFriendToRanked(friend: FriendEntry) {
    if (!party?.inviteCode) return;
    const memberIds = new Set(party.members.map((m) => m.id));
    if (memberIds.has(friend.id)) {
      toast.error(tInvite("alreadyInTeam"));
      return;
    }
    const link = `${window.location.origin}/dashboard/ranked?join=${party.inviteCode}`;
    await navigator.clipboard.writeText(link);
    toast.success(tInvite("linkCopied", { nickname: friend.displayName }));
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "friends", label: t("tabFriends"), count: friends.length },
    { id: "requests", label: t("tabRequests"), count: incoming.length },
    { id: "add", label: t("tabAdd") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              tab === item.id
                ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary"
                : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-foreground",
            )}
          >
            {item.label}
            {item.count != null && item.count > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 text-xs text-primary">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center rounded-card glass p-12">
          <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
        </div>
      ) : tab === "friends" ? (
        <FriendsList
          friends={friends}
          busy={busy}
          onGift={openGift}
          onAction={action}
          onInviteRanked={canInviteToRanked ? inviteFriendToRanked : undefined}
          t={t}
        />
      ) : tab === "requests" ? (
        <RequestsView
          incoming={incoming}
          outgoing={outgoing}
          busy={busy}
          onAction={action}
          t={t}
        />
      ) : (
        <AddFriends busy={busy} onAction={action} t={t} />
      )}

      <AnimatePresence>
        {giftOpen && giftTarget && (
          <GiftModal
            target={giftTarget}
            onClose={() => setGiftOpen(false)}
            onDone={() => {
              setGiftOpen(false);
              void refresh();
            }}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FriendsList({
  friends,
  busy,
  onGift,
  onAction,
  onInviteRanked,
  t,
}: {
  friends: FriendEntry[];
  busy: boolean;
  onGift: (user: FriendUser) => void;
  onAction: (path: string, body: Record<string, unknown>, msg?: string) => Promise<boolean>;
  onInviteRanked?: (friend: FriendEntry) => void;
  t: ReturnType<typeof useTranslations<"friends">>;
}) {
  if (friends.length === 0) {
    return <div className="rounded-card glass p-8 text-center text-muted">{t("noFriends")}</div>;
  }
  return (
    <ul className="overflow-hidden rounded-card glass">
      {friends.map((friend) => (
        <li
          key={friend.id}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
        >
          <Avatar user={friend} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/player/${friend.nickname}`}
              prefetch={false}
              className="truncate font-display text-sm font-semibold text-foreground hover:text-primary"
            >
              {friend.displayName}
            </Link>
            <p className="text-xs text-muted">
              {getCountryFlag(friend.country)} {t("level", { level: friend.level })} · ELO{" "}
              {friend.elo}
            </p>
          </div>
          {onInviteRanked && (
            <Button type="button" size="sm" variant="outline" onClick={() => onInviteRanked(friend)}>
              <Swords className="h-4 w-4" />
              {t("inviteRanked")}
            </Button>
          )}
          <Button type="button" size="sm" variant="primary" onClick={() => onGift(friend)}>
            <Gift className="h-4 w-4" />
            {t("gift")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            confirm={{
              title: t("removeConfirmTitle"),
              description: t("removeConfirmDesc", { nickname: friend.nickname }),
              confirmLabel: t("remove"),
              tone: "warning",
            }}
            onClick={() =>
              onAction(`/api/friends/${friend.friendshipId}`, { action: "remove" })
            }
          >
            <X className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function RequestsView({
  incoming,
  outgoing,
  busy,
  onAction,
  t,
}: {
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
  busy: boolean;
  onAction: (path: string, body: Record<string, unknown>, msg?: string) => Promise<boolean>;
  t: ReturnType<typeof useTranslations<"friends">>;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted">
          {t("incoming")}
        </h2>
        {incoming.length === 0 ? (
          <div className="rounded-card glass p-6 text-center text-sm text-muted">
            {t("noIncoming")}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-card glass">
            {incoming.map((req) => (
              <li
                key={req.friendshipId}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <Avatar user={req.user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    {req.user.displayName}
                  </p>
                  <p className="text-xs text-muted">{t("level", { level: req.user.level })}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    onAction(`/api/friends/${req.friendshipId}`, { action: "accept" }, t("accepted"))
                  }
                >
                  <Check className="h-4 w-4" />
                  {t("accept")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    onAction(`/api/friends/${req.friendshipId}`, { action: "reject" })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted">
          {t("outgoing")}
        </h2>
        {outgoing.length === 0 ? (
          <div className="rounded-card glass p-6 text-center text-sm text-muted">
            {t("noOutgoing")}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-card glass">
            {outgoing.map((req) => (
              <li
                key={req.friendshipId}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <Avatar user={req.user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    {req.user.displayName}
                  </p>
                  <p className="text-xs text-muted">{t("pending")}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    onAction(`/api/friends/${req.friendshipId}`, { action: "reject" })
                  }
                >
                  {t("cancel")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AddFriends({
  busy,
  onAction,
  t,
}: {
  busy: boolean;
  onAction: (path: string, body: Record<string, unknown>, msg?: string) => Promise<boolean>;
  t: ReturnType<typeof useTranslations<"friends">>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [steamUsers, setSteamUsers] = useState<SearchedUser[] | null>(null);
  const [steamAvailable, setSteamAvailable] = useState(true);
  const [steamLoading, setSteamLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/friends/search?q=${encodeURIComponent(query.trim())}`, {
        credentials: "same-origin",
      })
        .then((r) => r.json())
        .then((d) => setResults(d.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  function loadSteam() {
    setSteamLoading(true);
    fetch("/api/friends/steam", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        setSteamAvailable(d.available ?? false);
        setSteamUsers(d.users ?? []);
      })
      .catch(() => {
        setSteamAvailable(false);
        setSteamUsers([]);
      })
      .finally(() => setSteamLoading(false));
  }

  async function add(user: SearchedUser) {
    const ok = await onAction("/api/friends/request", { targetUserId: user.id }, t("requestSent"));
    if (ok) {
      setResults((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, relationship: "outgoing" } : u)),
      );
      setSteamUsers((prev) =>
        prev
          ? prev.map((u) => (u.id === user.id ? { ...u, relationship: "outgoing" } : u))
          : prev,
      );
    }
  }

  function renderUser(user: SearchedUser) {
    return (
      <li
        key={user.id}
        className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
      >
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/player/${user.nickname}`}
            prefetch={false}
            className="truncate font-display text-sm font-semibold text-foreground hover:text-primary"
          >
            {user.displayName}
          </Link>
          <p className="text-xs text-muted">
            {getCountryFlag(user.country)} {t("level", { level: user.level })}
          </p>
        </div>
        {user.relationship === "friends" ? (
          <span className="text-xs font-semibold text-emerald-400">{t("alreadyFriends")}</span>
        ) : user.relationship === "outgoing" ? (
          <span className="text-xs text-muted">{t("pending")}</span>
        ) : user.relationship === "incoming" ? (
          <span className="text-xs text-primary">{t("respondInRequests")}</span>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => add(user)}>
            <UserPlus className="h-4 w-4" />
            {t("add")}
          </Button>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4  text-muted" />
          <Input
            label={t("searchLabel")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
          />
        </div>
        {searching ? (
          <div className="mt-3 flex justify-center py-4">
            <Loader2 className="h-5 w-5 motion-safe-spin text-primary" />
          </div>
        ) : results.length > 0 ? (
          <ul className="mt-3 overflow-hidden rounded-card glass">{results.map(renderUser)}</ul>
        ) : query.trim().length >= 2 ? (
          <p className="mt-3 text-center text-sm text-muted">{t("noResults")}</p>
        ) : null}
      </div>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
            {t("steamTitle")}
          </h2>
          <Button type="button" size="sm" variant="outline" disabled={steamLoading} onClick={loadSteam}>
            {steamLoading ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : t("steamLoad")}
          </Button>
        </div>
        {steamUsers === null ? (
          <p className="mt-3 text-sm text-muted">{t("steamHint")}</p>
        ) : !steamAvailable ? (
          <p className="mt-3 text-sm text-warning">{t("steamUnavailable")}</p>
        ) : steamUsers.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("steamNoneOnPlatform")}</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-card glass">{steamUsers.map(renderUser)}</ul>
        )}
      </section>
    </div>
  );
}

function GiftModal({
  target,
  onClose,
  onDone,
  t,
}: {
  target: FriendUser;
  onClose: () => void;
  onDone: () => void;
  t: ReturnType<typeof useTranslations<"friends">>;
}) {
  const [mode, setMode] = useState<"coins" | "item">("coins");
  const [amount, setAmount] = useState("100");
  const [items, setItems] = useState<StoreItemLite[]>([]);
  const [itemId, setItemId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/store", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        const list: StoreItemLite[] = (d.items ?? [])
          .filter((i: StoreItemLite & { canBuyWithCoins?: boolean }) => i.canBuyWithCoins)
          .map((i: StoreItemLite & { productKind?: string }) => ({
            id: i.id,
            name: i.name,
            coinPrice: i.coinPrice,
            canBuyWithCoins: i.canBuyWithCoins,
            productKind: i.productKind ?? "SKIN",
          }));
        setItems(list);
        if (list[0]) setItemId(list[0].id);
      })
      .catch(() => setItems([]));
  }, []);

  async function send() {
    if (busy) return;
    setBusy(true);
    const recipient = { type: "user" as const, value: target.id };
    const result =
      mode === "coins"
        ? await secureApi("/api/gifts/coins", {
            method: "POST",
            json: { recipient, amount: Number(amount) },
          })
        : await secureApi("/api/gifts/item", {
            method: "POST",
            json: { recipient, storeItemId: itemId, currency: "coins" },
          });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("giftSent", { nickname: target.nickname }));
    if (mode === "item") {
      dispatchInventoryRefresh();
    }
    onDone();
  }

  return (
    <ModalPortal>
      <>
      <motion.button
        type="button"
        aria-label={t("close")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-90 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        className="fixed left-1/2 top-1/2 z-91 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-card glass-strong p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Gift className="h-5 w-5 text-primary" />
            {t("giftTo", { nickname: target.nickname })}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {(["coins", "item"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                mode === m
                  ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary"
                  : "text-muted hover:text-foreground",
              )}
            >
              {m === "coins" ? t("giftCoins") : t("giftItem")}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {mode === "coins" ? (
            <Input
              label={t("amount")}
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">{t("noGiftItems")}</p>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                {t("selectItem")}
              </label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full rounded-xl border border-border bg-[color-mix(in_srgb,var(--background)_80%,transparent)] px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.productKind === "SUBSCRIPTION" ? ` (${t("giftSubscription")})` : ""}
                    {item.coinPrice ? ` — ${item.coinPrice.toLocaleString("pt-BR")} ` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={busy || (mode === "item" && !itemId)}
            onClick={send}
          >
            {busy ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Gift className="h-4 w-4" />}
            {t("send")}
          </Button>
        </div>
      </motion.div>
      </>
    </ModalPortal>
  );
}
