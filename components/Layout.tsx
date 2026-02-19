import React from 'react';
import { Sidebar } from './Sidebar';
import { Workspace } from './Workspace';

export const Layout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-obsidian text-gray-100 font-sans selection:bg-deepViolet/30 selection:text-white">
      <Sidebar />
      <Workspace />
    </div>
  );
};