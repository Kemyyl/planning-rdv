import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Settings, LogOut, User, ChevronDown, Plus, Sun, Moon, FileText, Layers, Inbox, GraduationCap } from 'lucide-react';
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
            <span className="text-xl font-display text-[#0A1D35] tracking-tight">Synégo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {([['/', t('nav.accueil')], ['/services', t('nav.services')], ['/formations', t('nav.formations')]] as [string, string][]).map(([href, label]) => (
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
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#56627A]">
          <span>{t('footer.copyright')}</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#0A1D35] transition-colors">{t('footer.mentionsLegales')}</a>
            <a href="#" className="hover:text-[#0A1D35] transition-colors">{t('footer.confidentialite')}</a>
            {import.meta.env.VITE_INSTAGRAM_URL && (
              <a href={import.meta.env.VITE_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                aria-label="Instagram" className="flex items-center gap-1.5 hover:text-[#0A1D35] transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Instagram
              </a>
            )}
            {import.meta.env.VITE_WHATSAPP_URL && (
              <a href={import.meta.env.VITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                aria-label="WhatsApp" className="flex items-center gap-1.5 hover:text-[#0A1D35] transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            )}
            <a href="/admin" className="hover:text-[#0A1D35]">{t('footer.espacePro')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PatientLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { prenom, nom, logout } = useClientAuth();
  const { dark, toggle: toggleTheme } = useTheme();

  const fullName = [prenom, nom].filter(Boolean).join(' ') || prenom || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const NAV = [
    { href: '/mes-rdv', label: t('nav.mesRdv'), icon: Calendar },
    { href: '/mes-devis', label: t('nav.mesDevis'), icon: FileText },
    { href: '/mes-formations', label: t('nav.mesFormations'), icon: GraduationCap },
    { href: '/profil', label: t('profil.monProfil'), icon: User },
  ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#F7F2EB] flex">
      <aside className="w-56 bg-[#0A1D35] text-white flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-[#1C3352]">
          <div className="flex items-center gap-2.5 mb-0.5">
            <img src="/logo.png" alt="Synégo" className="h-7 w-7 object-contain brightness-0 invert" />
            <div className="text-lg font-display tracking-tight">Synégo</div>
          </div>
          <div className="text-xs text-[#6CAED6] mt-0.5">{t('patient.espacePatient')}</div>
        </div>

        <nav className="flex-1 py-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location.pathname === href;
            return (
              <Link key={href} to={href}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  active ? 'bg-[#1C3352] text-white' : 'text-[#A8B8C8] hover:bg-[#1C3352] hover:text-white'
                }`}>
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-[#1C3352]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35] shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{fullName}</div>
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
          <h1 className="text-xl font-bold text-[#0A1D35]">{title || ''}</h1>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={toggleTheme}
              className="p-2 rounded-xl border border-[#E7DCCD] bg-white hover:bg-[#F7F2EB] transition-colors text-[#56627A]"
              title={dark ? t('nav.modeClair') : t('nav.modeSombre')}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/reservation"
              className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1C3352] transition-colors">
              <Plus size={14} /> {t('nav.nouveauRdv')}
            </Link>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { nom, token, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const [nbNouvelles, setNbNouvelles] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/demandes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { statut: string }[]) => {
        if (Array.isArray(d)) setNbNouvelles(d.filter(x => x.statut === 'nouveau').length);
      })
      .catch(() => {});
  }, [token, location.pathname]);

  const NAV = [
    { href: '/admin/dashboard', label: t('admin.tableauDeBord'), icon: LayoutDashboard, badge: 0 },
    { href: '/admin/planning', label: t('admin.agenda'), icon: Calendar, badge: 0 },
    { href: '/admin/clients', label: t('admin.clients'), icon: Users, badge: 0 },
    { href: '/admin/devis', label: t('admin.devis'), icon: FileText, badge: 0 },
    { href: '/admin/demandes', label: t('admin.demandes'), icon: Inbox, badge: nbNouvelles },
    { href: '/admin/prestations', label: t('admin.prestations'), icon: Layers, badge: 0 },
    { href: '/admin/formations', label: t('admin.formations'), icon: GraduationCap, badge: 0 },
    { href: '/admin/agenda', label: t('admin.parametres'), icon: Settings, badge: 0 },
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
            <div className="text-lg font-display tracking-tight">Synégo</div>
          </div>
          <div className="text-xs text-[#6CAED6] mt-0.5">{t('admin.espacePraticien')}</div>
        </div>

        <nav className="flex-1 py-3">
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = location.pathname === href;
            return (
              <Link key={href} to={href}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1C3352] text-white'
                    : 'text-[#A8B8C8] hover:bg-[#1C3352] hover:text-white'
                }`}>
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="bg-[#6CAED6] text-[#0A1D35] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
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
