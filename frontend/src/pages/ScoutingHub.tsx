import { CalendarDays, Star } from 'lucide-react';
import HubPage, { HubCard } from '../components/HubPage';

const cards: HubCard[] = [
  {
    icon: CalendarDays,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
    title: 'MiLB Schedule',
    description: 'View Minor League Baseball schedules and find upcoming games. Plan card show appearances and prospect scouting around game dates.',
    tags: ['Schedules', 'Teams', 'Upcoming Games'],
    route: '/milb-schedule',
  },
  {
    icon: Star,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
    title: 'Top Prospects',
    description: 'Browse top prospect rankings by team and league. Identify high-value prospect cards and track player development across organizations.',
    tags: ['Rankings', 'Teams', 'Player Development'],
    route: '/top-prospects',
  },
];

export default function ScoutingHub() {
  return (
    <HubPage
      title="Scouting"
      subtitle="Track Minor League schedules and top prospect rankings"
      breadcrumb="Scouting"
      cards={cards}
    />
  );
}
