"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Favorite = {
  id: string;
  entityType: "note" | "file" | "vault";
  entityId: string;
  createdAt: string;
};

export default function FavoritesPanel() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        setFavorites(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load favorites:", err);
        setLoading(false);
      });
  }, []);

  const removeFavorite = async (entityType: string, entityId: string) => {
    await fetch(`/api/favorites?entityType=${entityType}&entityId=${entityId}`, {
      method: "DELETE",
    });
    setFavorites(favorites.filter((f) => !(f.entityType === entityType && f.entityId === entityId)));
  };

  if (loading) {
    return (
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#4CAF50] mb-4">Избранное</h2>
        <div className="text-[#cccccc]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-[#4CAF50] mb-4">Избранное</h2>
      {favorites.length === 0 ? (
        <p className="text-[#cccccc]">Нет избранных элементов</p>
      ) : (
        <div className="space-y-2">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="flex items-center justify-between p-2 rounded-lg bg-[#333] border border-[#4CAF50]/20 hover:border-[#4CAF50]/40 transition-colors"
            >
              <Link
                href={`/admin/${favorite.entityType === "note" ? "notes" : favorite.entityType === "file" ? "files" : "vault"}`}
                className="flex items-center gap-2 flex-1"
              >
                <span className="text-xs px-2 py-0.5 rounded bg-[#4CAF50]/10 text-[#4CAF50]">
                  {favorite.entityType}
                </span>
                <span className="text-sm text-[#cccccc] truncate">{favorite.entityId}</span>
              </Link>
              <button
                onClick={() => removeFavorite(favorite.entityType, favorite.entityId)}
                className="text-[#cccccc] hover:text-red-400 transition-colors p-1"
                aria-label="Удалить из избранного"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

