import type { Metadata } from "next";
import { EventResultsManager } from "@/components/EventResultsManager";

export const metadata: Metadata = {
  title: "Event Results | Band of Brothers",
  description: "Enter future event placements for the Band of Brothers season.",
};

export default function EventsPage() {
  return <EventResultsManager />;
}
