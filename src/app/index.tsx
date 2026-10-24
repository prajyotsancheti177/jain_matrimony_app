import { Redirect } from 'expo-router';
import { useSession } from '../lib/stores';

export default function Index() {
  const status = useSession((s) => s.status);
  if (status === 'signedIn') return <Redirect href="/matches" />;
  if (status === 'onboarding') return <Redirect href="/onboarding/about" />;
  return <Redirect href="/welcome" />;
}
