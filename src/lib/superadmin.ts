import "server-only";
import { db, groups, groupMembers, players, matches } from "@/db";
import { eq, desc, sql } from "drizzle-orm";
import { getCurrentPlayer, getSessionUser } from "./session";
import { isGroupPro } from "./billing";

const DEFAULT_OWNER_EMAILS = [
  "russofranco86@gmail.com",
  "russofranco86@hotmail.com",
];

/**
 * Determina si el usuario actual es el dueño / SuperAdmin de la plataforma FulboMundial.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const envEmails = (process.env.SUPERADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmails = new Set([...DEFAULT_OWNER_EMAILS, ...envEmails]);

  if (user.email && allowedEmails.has(user.email.toLowerCase().trim())) {
    return true;
  }

  const player = await getCurrentPlayer();
  if (player) {
    if (player.email && allowedEmails.has(player.email.toLowerCase().trim())) {
      return true;
    }
    // Player ID 2 ('Fran') es el creador original en la base de producción
    if (player.id === 2) {
      return true;
    }
  }

  return false;
}

export async function requireSuperAdmin(): Promise<void> {
  if (!(await isSuperAdmin())) {
    throw new Error("Acceso denegado: se requieren permisos de Dueño (SuperAdmin).");
  }
}

export interface SuperAdminGroupRow {
  id: number;
  name: string;
  slug: string;
  format: string;
  inviteCode: string;
  createdAt: Date;
  isProDb: boolean;
  isWhitelistPro: boolean;
  effectiveIsPro: boolean;
  proPlan: string | null;
  proExpiresAt: Date | null;
  memberCount: number;
  matchCount: number;
  lastMatchDate: Date | null;
  admins: { playerId: number; name: string; email: string | null }[];
}

export async function getSuperAdminDashboardData() {
  await requireSuperAdmin();

  const allGroups = await db.select().from(groups).orderBy(desc(groups.createdAt));

  const memberRows = await db
    .select({
      groupId: groupMembers.groupId,
      playerId: players.id,
      name: players.name,
      email: players.email,
      role: groupMembers.role,
      status: groupMembers.status,
    })
    .from(groupMembers)
    .innerJoin(players, eq(players.id, groupMembers.playerId));

  const matchStatsRows = await db
    .select({
      groupId: matches.groupId,
      count: sql<number>`count(*)::int`,
      lastMatchDate: sql<string | null>`max(${matches.matchDate})`,
    })
    .from(matches)
    .groupBy(matches.groupId);

  const [{ totalPlayers }] = await db
    .select({ totalPlayers: sql<number>`count(*)::int` })
    .from(players);

  const whitelist = new Set(
    (process.env.PRO_WHITELIST_SLUGS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  const matchMap = new Map<number, { count: number; lastMatchDate: Date | null }>();
  for (const m of matchStatsRows) {
    if (m.groupId !== null) {
      matchMap.set(m.groupId, {
        count: m.count,
        lastMatchDate: m.lastMatchDate ? new Date(m.lastMatchDate) : null,
      });
    }
  }

  const enrichedGroups: SuperAdminGroupRow[] = allGroups.map((g) => {
    const gMembers = memberRows.filter(
      (m) => m.groupId === g.id && m.status === "active"
    );
    const admins = gMembers
      .filter((m) => m.role === "admin")
      .map((m) => ({
        playerId: m.playerId,
        name: m.name,
        email: m.email,
      }));

    const mStat = matchMap.get(g.id) ?? { count: 0, lastMatchDate: null };
    const isWhitelistPro = whitelist.has(g.slug.toLowerCase());
    const effectiveIsPro = isGroupPro(g);

    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      format: g.format,
      inviteCode: g.inviteCode,
      createdAt: g.createdAt,
      isProDb: g.isPro,
      isWhitelistPro,
      effectiveIsPro,
      proPlan: g.proPlan,
      proExpiresAt: g.proExpiresAt,
      memberCount: gMembers.length,
      matchCount: mStat.count,
      lastMatchDate: mStat.lastMatchDate,
      admins,
    };
  });

  const totalMatches = enrichedGroups.reduce((acc, g) => acc + g.matchCount, 0);
  const proGroupsCount = enrichedGroups.filter((g) => g.effectiveIsPro).length;

  return {
    groups: enrichedGroups,
    kpis: {
      totalGroups: enrichedGroups.length,
      proGroupsCount,
      freeGroupsCount: enrichedGroups.length - proGroupsCount,
      totalPlayers,
      totalMatches,
    },
  };
}
