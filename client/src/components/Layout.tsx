import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Settings, LogOut, User, ChevronDown, Plus, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';

function LangToggle() {
  const { i18n: i } = useTranslation();
  const current = i.language === 'fr' ? 'fr' : 'en';
  function toggle() {
    const next = current === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  }
  return (
    <button onClick={toggle}
      className="px-2.5 py-1.5 rounded-xl border border-[#E7DCCD] bg-white hover:bg-[#F7F2EB] transition-colors text-[#56627A] text-xs font-bold tracking-wide">
      {current === 'fr' ? 'EN' : 'FR'}
    </button>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { token, prenom, nom, logout } = useClientAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const { dark, toggle } = useTheme();

  const fullName = [prenom, nom].filter(Boolean).join(' ') || prenom || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-[#F7F2EB] flex flex-col">
      <header className="bg-white border-b border-[#E7DCCD] px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Synégo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-[#0A1D35] tracking-tight">Synégo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {([['/', t('nav.accueil')], ['/services', t('nav.services')], ['/#contact', t('nav.contact')]] as [string, string][]).map(([href, label]) => (
              <Link key={href} to={href} className="text-sm text-[#56627A] hover:text-[#0A1D35] font-medium transition-colors">{label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LangToggle />
            <button onClick={toggle}
              className="p-2 rounded-xl border border-[#E7DCCD] bg-white hover:bg-[#F7F2EB] transition-colors text-[#56627A]"
              title={dark ? t('nav.modeClair') : t('nav.modeSombre')}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/reservation" className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1C3352] transition-colors">
              <Plus size={14} /> {t('nav.nouveauRdv')}
            </Link>
            {token ? (
              <div className="relative">
                <button onClick={() => setShowDropdown(d => !d)}
                  className="flex items-center gap-2 bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl px-3 py-2 hover:bg-[#E7DCCD] transition-colors">
                  <div className="w-7 h-7 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35]">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-[#0A1D35]">{fullName}</span>
                  <ChevronDown size={13} className="text-[#56627A]" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-[#E7DCCD] rounded-[14px] shadow-lg w-44 py-1 z-50">
                    <Link to="/mes-rdv" onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#0A1D35] hover:bg-[#F7F2EB]">
                      <User size={14} /> {t('nav.monEspace')}
                    </Link>
                    <button onClick={() => { logout(); setShowDropdown(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#9B2C1F] hover:bg-[#F7F2EB] w-full text-left">
                      <LogOut size={14} /> {t('nav.deconnexion')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="flex items-center gap-1.5 text-sm text-[#56627A] hover:text-[#0A1D35] font-medium border border-[#E7DCCD] px-3 py-2 rounded-xl bg-white transition-colors">
                <User size={14} /> {t('nav.seConnecter')}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-0 border-t border-[#E7DCCD] py-6 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-[#56627A]">
          <span>{t('footer.copyright')}</span>
          <div className="flex gap-6">
            {([t('footer.mentionsLegales'), t('footer.confidentialite'), t('footer.instagram'), t('footer.whatsapp')] as string[]).map(l => (
              <a key={l} href="#" className="hover:text-[#0A1D35] transition-colors">{l}</a>
            ))}
            <a href="/admin" className="hover:text-[#0A1D35]">{t('footer.espacePro')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { nom, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();

  const NAV = [
    { href: '/admin/dashboard', label: t('admin.tableauDeBord'), icon: LayoutDashboard },
    { href: '/admin/planning', label: t('admin.agenda'), icon: Calendar },
    { href: '/admin/clients', label: t('admin.clients'), icon: Users },
    { href: '/admin/agenda', label: t('admin.parametres'), icon: Settings },
  ];

  const initiales = nom
    ? nom.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  function handleLogout() {
    logout();
    navigate('/admin');
  }

  return (
    <div className="min-h-screen bg-[#F7F2EB] flex">
      <aside className="w-56 bg-[#0A1D35] text-white flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-[#1C3352]">
          <div className="flex items-center gap-2.5 mb-0.5">
            <img src="/logo.png" alt="Synégo" className="h-7 w-7 object-contain brightness-0 invert" />
            <div className="text-lg font-bold tracking-tight">Synégo</div>
          </div>
          <div className="text-xs text-[#6CAED6] mt-0.5">{t('admin.espacePraticien')}</div>
        </div>

        <nav className="flex-1 py-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location.pathname === href;
            return (
              <Link key={href} to={href}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1C3352] text-white'
                    : 'text-[#A8B8C8] hover:bg-[#1C3352] hover:text-white'
                }`}>
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-[#1C3352]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#6CAED6] flex items-center justify-center text-xs font-bold text-[#0A1D35] shrink-0">
              {initiales}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{nom || 'Admin'}</div>
              <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-[#56627A] hover:text-[#D9C9B4] transition-colors mt-0.5">
                <LogOut size={11} />
                {t('nav.deconnexion')}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E7DCCD] px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#0A1D35]">{title}</h1>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={toggleTheme}
              className="p-2 rounded-xl border border-[#E7DCCD] bg-white hover:bg-[#F7F2EB] transition-colors text-[#56627A]"
              title={dark ? t('nav.modeClair') : t('nav.modeSombre')}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
