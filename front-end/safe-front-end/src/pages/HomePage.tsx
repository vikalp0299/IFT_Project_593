import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Safe Frontend</h1>
            {/* <p className="text-gray-600">Welcome to our application</p> */}
          </div>
          
          <div className="space-y-3">
            <Link to="/organization-registration">
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg">
                Organization Registration
              </Button>
            </Link>
            
            <Link to="/create-account">
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg">
                Create Account
              </Button>
            </Link>
            
            <Link to="/signin">
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg">
                Sign In
              </Button>
            </Link>
            
            <Button variant="outline" className="w-full" disabled>
              More Features Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
