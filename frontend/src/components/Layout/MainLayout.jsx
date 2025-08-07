// components/Layout/MainLayout.jsx
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 w-full min-h-screen bg-blue-50 p-8">{children}</main>
    </div>
  );
};

export default MainLayout;
