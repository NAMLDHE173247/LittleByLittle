const fs = require('fs');
const text = fs.readFileSync('client/src/App.css', 'utf8');

const newCss = `

/* COLLAPSED SIDEBAR FIXES */
.sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 0;
}
.sidebar.collapsed .sidebar-brand {
  gap: 0;
}
.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px 0;
}
.sidebar.collapsed .nav-icon {
  margin: 0;
  width: auto;
  text-align: center;
}
.sidebar.collapsed .sidebar-footer {
  align-items: center;
  padding: 12px 0;
}
.sidebar.collapsed .sidebar-user {
  justify-content: center;
  padding: 8px 0;
}
.sidebar.collapsed .sidebar-toggle {
  margin: 0 auto;
}
`;

if (!text.includes('/* COLLAPSED SIDEBAR FIXES */')) {
  fs.writeFileSync('client/src/App.css', text + newCss, 'utf8');
  console.log('Added collapsed sidebar fixes');
} else {
  console.log('Fixes already exist');
}
