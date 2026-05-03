import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="shrink-0 border-t border-black/5 bg-white/50 py-2 dark:border-white/5 dark:bg-[#1E1E1F]">
      <div className="flex justify-center text-center align-middle">
        <p className="text-[11px] text-gray-500 dark:text-slate-400">
          © DON GABRIEL ABLAY{' '}
          <a
            href="https://github.com/dgda"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
            tabIndex={-1}
          >
            @dgda
          </a>{' '}
          {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
