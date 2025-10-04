import { CreateAccount } from '../components/CreateAccount';

export const CreateAccountPage = () => {
  const handleAccountCreated = (accountData: { organizationName: string; username: string; password: string }) => {
    console.log('Account created:', accountData);
    // Handle account creation success
  };

  const handleSignIn = () => {
    console.log('Navigate to sign in');
    // Handle navigation to sign in
  };

  return (
    <CreateAccount 
      onAccountCreated={handleAccountCreated}
      onSignIn={handleSignIn}
    />
  );
};
