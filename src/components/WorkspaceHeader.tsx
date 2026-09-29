import React from 'react';
import T from '../theme/tokens';

interface WorkspaceHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ eyebrow, title, description, actions, children, onBack, backLabel = 'Back' }) => (
  <header className="sl-workspace-header">
    {onBack && <button className="sl-header-back" onClick={onBack}><span aria-hidden>&larr;</span> {backLabel}</button>}
    <div className="sl-workspace-heading-row">
      <div style={{ minWidth: 0, flex: '1 1 360px' }}>
        {eyebrow && <div className="sl-workspace-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="sl-header-actions">{actions}</div>}
    </div>
    {React.Children.toArray(children).length > 0 && <div style={{ marginTop: 18, color: T.text.secondary }}>{children}</div>}
  </header>
);

export default WorkspaceHeader;
