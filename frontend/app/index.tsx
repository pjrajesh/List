import { Redirect } from 'expo-router';

export default function Root() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Redirect href={'/(tabs)' as any} />;
}
