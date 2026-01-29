
import { defineStore } from "pinia";
import { db } from "@/firebase";
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
} from "firebase/firestore";
import { ref } from "vue";

export interface Season {
    id: string;
    name: string;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    createdAt: Date;
}

export interface SeasonStats {
    seasonId: string;
    seasonName: string;
    playerStats: Record<string, PlayerSeasonStat>;
}

export interface PlayerSeasonStat {
    playerId: string;
    playerName: string; // Optional, might fetch separately
    totalScore: number;
    totalMoney: number;
    gamesPlayed: number;
    wins: number; // Games with positive score
    napoleonCount: number; // Number of times playing as Napoleon
    napoleonWins: number; // Number of times winning as Napoleon
}

export const useSeasonStore = defineStore("season", () => {
    const currentSeason = ref<Season | null>(null);
    const seasons = ref<Season[]>([]);
    const loading = ref(false);

    // 取得目前活躍的賽季
    async function getActiveSeason(): Promise<Season | null> {
        try {
            loading.value = true;
            const seasonsRef = collection(db, "seasons");
            const q = query(seasonsRef, where("isActive", "==", true));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // 理論上應該只有一個活躍賽季
                const docRes = querySnapshot.docs[0];
                const data = docRes.data();
                currentSeason.value = {
                    id: docRes.id,
                    name: data.name,
                    startDate: data.startDate.toDate(),
                    endDate: data.endDate ? data.endDate.toDate() : undefined,
                    isActive: data.isActive,
                    createdAt: data.createdAt.toDate()
                }
                return currentSeason.value;
            }
            currentSeason.value = null;
            return null;
        } catch (error: any) {
            console.error("Failed to fetch active season:", error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    // 創建新賽季 (會自動結束舊賽季)
    async function createSeason(name: string) {
        try {
            // 先結束所有活躍賽季
            const activeSeason = await getActiveSeason();
            if (activeSeason) {
                await endSeason(activeSeason.id);
            }

            const newSeasonData = {
                name,
                startDate: new Date(),
                isActive: true,
                createdAt: new Date(),
            };

            const docRef = await addDoc(collection(db, "seasons"), newSeasonData);
            currentSeason.value = {
                id: docRef.id,
                ...newSeasonData
            };

            // Update local list
            await fetchSeasons();

        } catch (error: any) {
            throw new Error(`Create season failed: ${error.message}`);
        }
    }

    // 結束賽季
    async function endSeason(seasonId: string) {
        try {
            const seasonRef = doc(db, "seasons", seasonId);
            await updateDoc(seasonRef, {
                isActive: false,
                endDate: new Date()
            });
            if (currentSeason.value?.id === seasonId) {
                currentSeason.value = null;
            }
        } catch (error: any) {
            throw new Error(`End season failed: ${error.message}`);
        }
    }

    // 取得所有賽季列表
    async function fetchSeasons() {
        try {
            loading.value = true;
            const q = query(collection(db, "seasons"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            seasons.value = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    startDate: data.startDate.toDate(),
                    endDate: data.endDate?.toDate(),
                    isActive: data.isActive,
                    createdAt: data.createdAt.toDate()
                }
            });
        } catch (error) {
            console.error("Fetch seasons failed", error);
        } finally {
            loading.value = false;
        }
    }

    // 取得賽季統計
    async function getSeasonStats(seasonId: string): Promise<SeasonStats> {
        try {
            // 1. Get season info
            const season = seasons.value.find(s => s.id === seasonId);
            if (!season) {
                // Try to fetch specific doc if not in list
                // For simplicity, just error now
                throw new Error("Season not found in local cache");
            }

            // 2. Query games in this season
            // We need to query 'games' collection where seasonId == seasonId and status == 'finished'
            const gamesRef = collection(db, "games");
            const q = query(
                gamesRef,
                where("seasonId", "==", seasonId),
                where("status", "==", "finished")
            );

            const snapshot = await getDocs(q);
            const stats: Record<string, PlayerSeasonStat> = {};

            for (const gameDoc of snapshot.docs) {
                const gameData = gameDoc.data();
                const scores = gameData.scores as Record<string, number>;
                const gameId = gameDoc.id;

                Object.entries(scores).forEach(([playerId, score]) => {
                    if (!stats[playerId]) {
                        stats[playerId] = {
                            playerId,
                            playerName: "Unknown",
                            totalScore: 0,
                            totalMoney: 0,
                            gamesPlayed: 0,
                            wins: 0,
                            napoleonCount: 0,
                            napoleonWins: 0
                        };
                    }

                    stats[playerId].totalScore += score;

                    const betAmount = Number(gameData.betAmount) || 0;
                    stats[playerId].totalMoney += score * betAmount;

                    stats[playerId].gamesPlayed += 1;
                    if (score > 0) {
                        stats[playerId].wins += 1;
                    }
                });

                // Fetch rounds for this game to calculate Napoleon stats
                try {
                    const roundsRef = collection(db, "games", gameId, "rounds");
                    const roundsSnapshot = await getDocs(roundsRef);

                    roundsSnapshot.docs.forEach(roundDoc => {
                        const roundData = roundDoc.data();
                        const napoleonId = roundData.napoleonId;
                        const roundScores = roundData.scores || {};
                        const napoleonScore = roundScores[napoleonId] || 0;

                        if (stats[napoleonId]) {
                            stats[napoleonId].napoleonCount += 1;
                            // Contract successful if napoleon has positive score
                            if (napoleonScore > 0) {
                                stats[napoleonId].napoleonWins += 1;
                            }
                        }
                    });
                } catch (e) {
                    console.error(`Failed to fetch rounds for game ${gameId} in season stats`, e);
                }
            }

            // Fetch user names for the stats
            // Optimisation: Pass users map or store it in season store? 
            // For now, let's assume the component will handle name mapping or we fetch it here.
            // Let's rely on component for display names for now.

            return {
                seasonId,
                seasonName: season.name,
                playerStats: stats
            };

        } catch (error: any) {
            throw new Error(`Get season stats failed: ${error.message}`);
        }
    }

    return {
        currentSeason,
        seasons,
        loading,
        getActiveSeason,
        createSeason,
        endSeason,
        fetchSeasons,
        getSeasonStats
    };
});
