import { SignIn } from '../components/SignIn';

export const SignInPage = () => {
  const handleSignIn = (organizationName: string) => {
    console.log('Sign in with organization:', organizationName);
    // Handle sign in logic
  };

  const handleSignUp = () => {
    console.log('Navigate to sign up');
    // Handle navigation to sign up
  };

  return (
    <SignIn 
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
    />
  );
};
