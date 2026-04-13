import React from 'react';
import { Link } from 'react-router-dom';
import { Layout, ArrowRight, Zap, Shield, BarChart3, Globe, Layers, CheckCircle, BellRing, Lock, Activity, Truck } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-white  text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">

      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-600 rounded-tr-xl rounded-bl-xl rounded-tl-sm rounded-br-sm rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
              <div className="absolute inset-0 bg-violet-400 rounded-tr-xl rounded-bl-xl rounded-tl-sm rounded-br-sm -rotate-12 opacity-80 mix-blend-multiply"></div>
              <Layout size={16} className="text-white relative z-10" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-900">Nexus<span className="text-indigo-600 font-light">Bill</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Features
            </a>
            <a
              href="#solutions"
              onClick={(e) => { e.preventDefault(); document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Solutions
            </a>
            <a
              href="#about"
              onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              About
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all duration-300 hover:-translate-y-0.5">
              Portal Access
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-30 pb-20 px-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/60 via-white to-white blur-3xl"></div>

        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Nexus v5.0 is Live
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-tight">
            The intelligent operating system for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">modern commerce.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Unify your POS, inventory alerts, multi-tenant billing, payment tracking, and GST compliance in one beautifully crafted architecture.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-semibold text-sm hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-600/20 transition-all duration-300">
              Request Platform Access <ArrowRight size={18} />
            </Link>
            <a href="#about" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-all duration-300">
              Read Our Vision
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="scroll-mt-24 py-12 bg-slate-50/50 outline-none border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">Powerful Core Features</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">Everything you need to manage your business effectively.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast POS</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Execute transactions instantly with our keyboard-first optimized point of sale system.</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                <BellRing size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Stock Alerts</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Never run out of inventory. Get automated low-stock warnings and real-time updates.</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                <Truck size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">B2B Wholesale & Supply</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Simplify bulk orders, wholesale rates, and specific client discounts automatically.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast Payment Security</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Enterprise-grade encryption protecting your transactions data 24/7 securely.</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mb-6">
                <Activity size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Tracking</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Track pending payments, partial dues, and total ledgers for B2B & B2C clients flawlessly.</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Accounting</h3>
              <p className="text-slate-500 text-sm leading-relaxed">GST compliant invoices, dynamic ledgers, and comprehensive financial reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTIONS SECTION */}
      <section id="solutions" className="scroll-mt-24 py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-semibold tracking-wide">
                Seamless Operations
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                Simple Solutions for <br />Everyday Problems.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-4">
                We've taken the hardest business operations and made them as easy as a few clicks. No training required.
              </p>

              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <CheckCircle className="text-indigo-500 shrink-0" size={24} />
                  <div>
                    <strong className="text-slate-800 block text-lg font-semibold">Effortless Billing</strong>
                    <span className="text-slate-500 text-sm">Create professional, GST-ready invoices instantly.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <CheckCircle className="text-indigo-500 shrink-0" size={24} />
                  <div>
                    <strong className="text-slate-800 block text-lg font-semibold">Never Run Out of Stock</strong>
                    <span className="text-slate-500 text-sm">Our system automatically warns you before your best-selling items sell out.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <CheckCircle className="text-indigo-500 shrink-0" size={24} />
                  <div>
                    <strong className="text-slate-800 block text-lg font-semibold">Know Who Owes You</strong>
                    <span className="text-slate-500 text-sm">A centralized list of all pending payments from your clients.</span>
                  </div>
                </li>
              </ul>

              <div className="pt-4">
                <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors inline-flex items-center gap-2">
                  Get Started Now <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-50 rounded-[2.5rem] p-4 border border-slate-100 relative group overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-80"></div>
                
                {/* Advanced Telemetry Node */}
                <div className="relative bg-white rounded-[2rem] shadow-2xl shadow-indigo-200/50 border border-slate-200/60 overflow-hidden transform group-hover:scale-[1.02] transition-all duration-700 aspect-video min-h-[320px] lg:min-h-[400px]">
                  <img 
                    src="/nexus_dashboard.png" 
                    alt="NexusBill Dashboard Preview" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Floating Metric Chips */}
                  <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm flex items-center gap-3 animate-bounce shadow-xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-extrabold text-slate-900 tracking-wider">NETWORK STATUS: OPTIMAL</span>
                  </div>

                  <div className="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-1 translate-y-2 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Active Nodes</p>
                    <div className="flex items-center gap-2">
                       <p className="text-2xl font-black text-white tracking-tighter">1,248+</p>
                       <Zap size={14} className="text-indigo-400 fill-indigo-400" />
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION (Vision, Motive, Information) */}
      <section id="about" className="scroll-mt-24 py-20 bg-slate-50 outline-none border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">About Us</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">Who we are, what we build, and why we do it.</p>
          </div>

          {/* Unified Grid Alignment */}
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <Globe size={20} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Our Motive</h3>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Our core motive is to democratize institutional-grade billing software for small to medium enterprises.
                Tracking inventory and managing clients shouldn't require an IT department.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                  <Layers size={20} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Our Vision</h3>
              </div>
              <p className="text-slate-500 leading-relaxed">
                To become the unified financial operating system bridging retail POS, B2B wholesale, and digital
                payment infrastructures seamlessly. We envision a future where compliance happens natively.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Usages & Application</h3>
              <ul className="space-y-4 text-slate-500">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div> Retail Supermarkets & POS Shops
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div> Wholesale B2B Distributors
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div> Multi-branch Franchises
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div> Service Providers with Invoicing
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Our Information</h3>
              <div className="space-y-3 text-slate-500">
                <p><strong>Headquarters:</strong> Tech Park, Tower A, Bangalore, IN</p>
                <p><strong>Support Mail:</strong> support@nexusbill.enterprise</p>
                <p><strong>Contact Line:</strong> +91 1800-NEXUS-00</p>
                <p className="pt-3 text-sm border-t border-slate-100 mt-3 text-indigo-500 font-medium">Currently onboarding enterprise clients by unique valid access IDs only.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA SECTION - Updated to Light Theme */}
      <section className="py-20 bg-indigo-600 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-indigo-500 rounded-full blur-3xl opacity-50 -translate-y-1/2"></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center opacity-90 mb-6 drop-shadow-xl">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm rotate-12"></div>
            <Layout size={24} className="text-white relative z-10" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Ready to experience NexusBill?</h2>
          <p className="text-indigo-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Built by engineers who care about design and performance. Join NexusBill to take control of your financial infrastructure instantly.
          </p>
          <div className="pt-6">
            <Link to="/login" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1">
              Login to Workspace <ArrowRight size={18} />
            </Link>
          </div>
          <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} NexusBilling Infrastructure.</p>

        </div>
      </section>


    </div>
  );
};

export default Landing;
