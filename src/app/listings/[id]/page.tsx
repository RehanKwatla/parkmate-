import * as React from "react";
import { notFound } from "next/navigation";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { ListingDetailClient } from "@/components/parking/listing-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return MOCK_PARKING_SPACES.map((space) => ({ id: space.id }));
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const space = MOCK_PARKING_SPACES.find((s) => s.id === id);

  if (!space) {
    notFound();
  }

  return <ListingDetailClient space={space} />;
}
