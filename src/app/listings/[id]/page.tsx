import * as React from "react";
import { notFound } from "next/navigation";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { ListingDetailClient } from "@/components/parking/listing-detail-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapDbSpaceToParkingSpace, ParkingSpace } from "@/types/parking";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return MOCK_PARKING_SPACES.map((space) => ({ id: space.id }));
}

export const instant = false;

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;

  let space: ParkingSpace | undefined;

  // Try Supabase first
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: dbSpace, error } = await supabase
        .from("parking_spaces")
        .select("*, profiles:owner_id (*)")
        .eq("id", id)
        .maybeSingle();

      if (!error && dbSpace) {
        const spaceWithProfile = dbSpace as unknown as { profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1] };
        space = mapDbSpaceToParkingSpace(dbSpace, spaceWithProfile.profiles);
      }
    }
  } catch {
    // Continue to mock fallback
  }

  // Fallback to mock data
  if (!space) {
    space = MOCK_PARKING_SPACES.find((s) => s.id === id);
  }

  if (!space) {
    notFound();
  }

  return <ListingDetailClient space={space} />;
}
