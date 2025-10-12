interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  return (
    <header className="h-12 bg-card border-b border-border flex items-center px-4 sticky top-0 z-50">
      {/* todo: add sidebar toggle icon  */}
      {/* <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="hover:bg-secondary"
      >
        <Menu className="h-5 w-5" /> 
      </Button>
       */}
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Imitation Machine
        </h1>
      </div>
      <div className="w-10" /> {/* Spacer for balance */}
    </header>
  );
};
