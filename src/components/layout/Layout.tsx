import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout component - Provides the main application layout structure
 * Simplified to remove authentication logic and circular dependencies
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <ErrorBoundary componentName="Layout">
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 overflow-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Layout;
