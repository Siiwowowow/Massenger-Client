export interface NavLink {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface NavbarProps {
  showTopBar?: boolean;
  showSearch?: boolean;
}

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}