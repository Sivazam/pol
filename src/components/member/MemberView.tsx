'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, ChevronRight, Activity, User, Calendar, MapPin,
  Briefcase, CreditCard, Shield, Users, Home, FileText, Phone,
  Heart, GraduationCap, Eye
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';

interface MemberData {
  id: string;
  beneficiaryName: string;
  relation: string;
  age: number;
  gender: string;
  aadharNo: string | null;
  _piiAccess?: 'full' | 'masked' | 'none';
  occupation: string | null;
  family: {
    id: string;
    pdfId: string;
    beneficiaryName: string;
    rrEligibility: string;
    hasFirstScheme: boolean;
    village: {
      id: string; name: string; nameTelugu: string;
      mandal: { name: string; nameTelugu: string; color: string; };
    };
  };
}

export default function MemberView() {
  const selectedMemberId = useAppStore((s) => s.selectedMemberId);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);

  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedMemberId) { setView('dashboard'); return; }
    fetch(`/api/member/${selectedMemberId}`)
      .then(r => r.json())
      .then(data => { setMember(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedMemberId, setView]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  if (loading) {
    return (
      <ViewLayout maxWidth="max-w-3xl" navTitle="MEMBER">
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Member</p>
          </div>
        </div>
      </ViewLayout>
    );
  }

  if (!member) return (
    <ViewLayout maxWidth="max-w-3xl" navTitle="MEMBER">
      <div className="flex items-center justify-center py-32"><p className="text-red-600 font-medium">Member not found</p></div>
    </ViewLayout>
  );

  const initials = member.beneficiaryName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const accentColor = member.family?.village?.mandal?.color || '#D97706';

  // Avatar color based on gender and relation
  const getAvatarStyle = () => {
    if (member.relation === 'Head') return { bg: 'bg-[#0F2B46]', text: 'text-white', ring: 'ring-[#0F2B46]/20' };
    if (member.gender === 'Female') return { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200' };
    return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' };
  };
  const avatarStyle = getAvatarStyle();
  const showFullAadhaar = member._piiAccess === 'full';
  const aadharDisplay = member.aadharNo
    ? (showFullAadhaar ? member.aadharNo : `XXXX-XXXX-${member.aadharNo.slice(-4)}`)
    : 'Not Available';
  const aadharSublabel = member.aadharNo
    ? (showFullAadhaar ? 'Full access' : 'Partially masked')
    : 'Not registered';

  // Gender icon
  const GenderIcon = member.gender === 'Male' ? User : member.gender === 'Female' ? Heart : User;

  // Info items with enhanced styling
  const infoItems = [
    { label: 'Age', value: `${member.age} years`, sublabel: member.age < 18 ? 'Minor (Under 18)' : 'Adult', icon: Calendar, color: member.age < 18 ? 'text-amber-600' : 'text-slate-600', bg: member.age < 18 ? 'bg-amber-50' : 'bg-slate-50', border: member.age < 18 ? 'border-amber-200' : 'border-slate-200' },
    { label: 'Gender', value: member.gender, sublabel: member.gender === 'Male' ? '♂ Male' : member.gender === 'Female' ? '♀ Female' : member.gender, icon: GenderIcon, color: member.gender === 'Female' ? 'text-purple-600' : 'text-slate-600', bg: member.gender === 'Female' ? 'bg-purple-50' : 'bg-slate-50', border: member.gender === 'Female' ? 'border-purple-200' : 'border-slate-200' },
    { label: 'Aadhaar Number', value: aadharDisplay, sublabel: aadharSublabel, icon: CreditCard, color: showFullAadhaar ? 'text-emerald-700' : 'text-slate-600', bg: showFullAadhaar ? 'bg-emerald-50' : 'bg-slate-50', border: showFullAadhaar ? 'border-emerald-200' : 'border-slate-200' },
    { label: 'Occupation', value: member.occupation || 'Not Available', sublabel: member.occupation ? 'Employed' : 'Not specified', icon: Briefcase, color: member.occupation ? 'text-teal-600' : 'text-slate-400', bg: member.occupation ? 'bg-teal-50' : 'bg-slate-50', border: member.occupation ? 'border-teal-200' : 'border-slate-200' },
    { label: 'Minor Status', value: member.age < 18 ? 'Yes — Under 18' : 'No — Adult', sublabel: member.age < 18 ? 'Eligible for child benefits' : 'Eligible for adult schemes', icon: Shield, color: member.age < 18 ? 'text-orange-600' : 'text-green-600', bg: member.age < 18 ? 'bg-orange-50' : 'bg-green-50', border: member.age < 18 ? 'border-orange-200' : 'border-green-200' },
    { label: 'Relation to Head', value: member.relation, sublabel: member.relation === 'Head' ? 'Primary applicant' : 'Family member', icon: Users, color: member.relation === 'Head' ? 'text-[#0F2B46]' : 'text-slate-600', bg: member.relation === 'Head' ? 'bg-[#0F2B46]/5' : 'bg-slate-50', border: member.relation === 'Head' ? 'border-[#0F2B46]/20' : 'border-slate-200' },
  ];

  return (
    <ViewLayout maxWidth="max-w-3xl" navTitle={member.beneficiaryName} navTitleColor="#FBBF24" accentDotColor="#D97706" navSubtitle={member.family.pdfId}>
      <div ref={containerRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Avatar & Name - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="anim-in opacity-0 flex flex-col items-center text-center"
          >
            {/* Avatar with ring effect */}
            <div className="relative mb-5">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold ${avatarStyle.bg} ${avatarStyle.text} ring-4 ${avatarStyle.ring} shadow-xl`}>
                {initials}
              </div>
              {/* Gender badge overlay */}
              <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md ${
                member.gender === 'Female' ? 'bg-purple-500' : 'bg-[#0F2B46]'
              }`}>
                <GenderIcon className="w-4 h-4 text-white" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{member.beneficiaryName}</h1>

            {/* Relation & Age badges */}
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                member.relation === 'Head' ? 'bg-[#0F2B46]/10 text-[#0F2B46] border-[#0F2B46]/20' :
                member.relation === 'Spouse' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {member.relation === 'Head' && <span className="mr-1">★</span>}
                {member.relation}
              </span>
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                member.age < 18 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
              }`}>
                {member.age} years {member.age < 18 ? '(Minor)' : ''}
              </span>
            </div>
          </motion.div>

          {/* Quick Info Strip */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="anim-in opacity-0 grid grid-cols-3 gap-3"
          >
            <div className="gov-card p-3 text-center border-t-[3px] border-t-[#0F2B46]">
              <p className="text-xs text-slate-400 mb-1">Age</p>
              <p className="text-xl font-bold text-slate-900">{member.age}</p>
              <p className="text-[10px] text-slate-400">{member.age < 18 ? 'Minor' : 'Adult'}</p>
            </div>
            <div className="gov-card p-3 text-center border-t-[3px] border-t-purple-400">
              <p className="text-xs text-slate-400 mb-1">Gender</p>
              <p className="text-xl font-bold text-slate-900">{member.gender === 'Male' ? '♂' : member.gender === 'Female' ? '♀' : '?'}</p>
              <p className="text-[10px] text-slate-400">{member.gender}</p>
            </div>
            <div className="gov-card p-3 text-center border-t-[3px] border-t-amber-400">
              <p className="text-xs text-slate-400 mb-1">Relation</p>
              <p className="text-xl font-bold text-slate-900">{member.relation === 'Head' ? '★' : '#'}</p>
              <p className="text-[10px] text-slate-400">{member.relation}</p>
            </div>
          </motion.div>

          {/* Personal Information Card - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="anim-in opacity-0 gov-card p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#0F2B46]/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#0F2B46]" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-wide">PERSONAL INFORMATION</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {infoItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${item.bg} ${item.border} transition-all hover:shadow-sm`}
                >
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.color} truncate`}>{item.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.sublabel}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Family Context - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="anim-in opacity-0 gov-card p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Home className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-wide">FAMILY CONTEXT</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Beneficiary Name', value: `${member.family.beneficiaryName}`, icon: Users, color: 'text-[#0F2B46]' },
                { label: 'PDF ID', value: member.family.pdfId, icon: FileText, color: 'text-amber-700', isGovBadge: true },
                { label: 'Village', value: member.family.village.name, telugu: member.family.village.nameTelugu, icon: MapPin, color: 'text-slate-700' },
                { label: 'Mandal', value: member.family.village.mandal.name, telugu: member.family.village.mandal.nameTelugu, icon: Eye, color: 'text-slate-700', accent: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                  <span className="text-xs text-slate-400 flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.isGovBadge ? (
                      <span className="gov-badge px-2.5 py-1 rounded-md border bg-amber-50 border-amber-200 text-amber-700 font-semibold tracking-wider">
                        {item.value}
                      </span>
                    ) : (
                      <span className={`text-sm font-medium ${item.color}`}>
                        {item.value}
                        {item.telugu && <span className="text-slate-400 ml-1.5 text-xs">({item.telugu})</span>}
                      </span>
                    )}
                    {item.accent && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* View Family Button */}
            <button
              onClick={() => navigateToFamily(member.family.pdfId, member.family.id)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-[#0F2B46] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <Eye className="w-4 h-4" />
              View Full Family Details
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Help Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="anim-in opacity-0 bg-[#0F2B46]/5 border border-[#0F2B46]/10 rounded-xl p-5 text-center"
          >
            <p className="text-xs text-slate-500">
              Need to update member information? Contact the <span className="font-semibold text-[#0F2B46]">Mandal Revenue Office</span> or visit the nearest <span className="font-semibold text-[#0F2B46]">Meeseva Center</span>.
            </p>
          </motion.div>
        </div>
    </ViewLayout>
  );
}
