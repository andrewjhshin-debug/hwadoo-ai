"use client";

import HipRoom from "@/components/HipRoom";
import WalkingMerit from "@/components/WalkingMerit";

export default function WalkingPage() {
  return (
    <HipRoom here="/walking" scroll={false}>
      <WalkingMerit />
    </HipRoom>
  );
}
