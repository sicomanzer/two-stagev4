import React, { useState, useEffect } from 'react';
import { Settings, XCircle, Save, LogOut, Bell, Database, User, Key, Terminal, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramBotToken: string;
  setTelegramBotToken: (token: string) => void;
  telegramChatId: string;
  setTelegramChatId: (id: string) => void;
  onSave: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  telegramBotToken,
  setTelegramBotToken,
  telegramChatId,
  setTelegramChatId,
  onSave
}: SettingsModalProps) {
  const [isTestDbLoading, setIsTestDbLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [isClearCacheLoading, setIsClearCacheLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'system' | 'account'>('notifications');
  
  // Progress States
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [clearProgress, setClearProgress] = useState(0);
  const [syncMode, setSyncMode] = useState<'default' | 'all' | null>(null);

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  // Poll Sync Status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isSyncLoading) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch('/api/system/sync-status');
          const data = await res.json();
          if (data && data.status !== 'error') {
            setSyncProgress(data.percent || 0);
            if (data.ticker) {
              setSyncStatusText(`กำลังดึงข้อมูล: ${data.ticker} (${data.current}/${data.total})`);
            } else {
              setSyncStatusText('กำลังเตรียมการอัปเดต...');
            }
          }
        } catch (e) {
          console.error("Failed to poll sync status", e);
        }
      }, 1000);
    } else {
      setSyncProgress(0);
      setSyncStatusText('');
      setSyncMode(null);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSyncLoading]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (newPassword.length < 6) {
      alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsPasswordChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('✅ เปลี่ยนรหัสผ่านสำเร็จ');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(`❌ เปลี่ยนรหัสผ่านไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const testDbConnection = async () => {
    setIsTestDbLoading(true);
    try {
      const res = await fetch('/api/test-db');
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n${data.details}`);
      } else {
        alert(`❌ เชื่อมต่อฐานข้อมูลไม่สำเร็จ\n${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsTestDbLoading(false);
    }
  };

  const runSync = async (mode: 'default' | 'all') => {
    setIsSyncLoading(true);
    setSyncMode(mode);
    setSyncProgress(0);
    setSyncStatusText('กำลังเตรียมการอัปเดต...');
    try {
      const res = await fetch('/api/system/sync-thaifin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      setSyncProgress(100);
      setSyncStatusText('เสร็จสิ้น');
      
      // Delay alert slightly so user can see 100%
      setTimeout(() => {
        if (data.success) {
          alert(`✅ อัปเดตข้อมูลสำเร็จ\nโหมด: ${mode === 'all' ? 'ทุกหุ้น' : 'หุ้นที่กำหนด'}\n\n${data.outputTail || ''}`);
        } else {
          alert(`❌ อัปเดตข้อมูลไม่สำเร็จ\n${data.error || data.outputTail || 'Unknown error'}`);
        }
      }, 500);
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      // Keep loading state true slightly longer for the animation to finish
      setTimeout(() => setIsSyncLoading(false), 1000);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('คุณต้องการเคลียร์แคชข้อมูลหุ้นใช่หรือไม่? ข้อมูลทั้งหมดในแคชจะถูกลบและต้องดึงใหม่')) {
      return;
    }
    
    setIsClearCacheLoading(true);
    setClearProgress(0);
    
    // Simulate fast progress for clear cache
    const interval = setInterval(() => {
      setClearProgress(prev => {
        if (prev >= 90) return 90;
        return prev + 30;
      });
    }, 100);

    try {
      const res = await fetch('/api/system/clear-cache', {
        method: 'POST',
      });
      const data = await res.json();
      
      clearInterval(interval);
      setClearProgress(100);
      
      setTimeout(() => {
        if (data.success) {
          alert(`✅ ${data.message || 'เคลียร์แคชเรียบร้อยแล้ว'}`);
        } else {
          alert(`❌ เคลียร์แคชไม่สำเร็จ: ${data.error}`);
        }
      }, 300);
    } catch (err: any) {
      clearInterval(interval);
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsClearCacheLoading(false);
        setClearProgress(0);
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="text-emerald-600" />
              ตั้งค่า (Settings)
            </h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 pb-3 text-sm font-medium flex justify-center items-center gap-2 transition-colors relative ${
                activeTab === 'notifications' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Bell size={16} />
              แจ้งเตือน
              {activeTab === 'notifications' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 pb-3 text-sm font-medium flex justify-center items-center gap-2 transition-colors relative ${
                activeTab === 'system' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Terminal size={16} />
              ระบบ
              {activeTab === 'system' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`flex-1 pb-3 text-sm font-medium flex justify-center items-center gap-2 transition-colors relative ${
                activeTab === 'account' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User size={16} />
              บัญชี
              {activeTab === 'account' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
              )}
            </button>
          </div>
        </div>
        
        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            
            {/* Tab: Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Bot Token</label>
                  <input
                    type="text"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhI..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    สร้าง Bot ได้ที่ <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">@BotFather</a>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Chat ID</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="123456789"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    หา Chat ID ได้จาก <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">@userinfobot</a>
                  </p>
                </div>
              </div>
            )}

            {/* Tab: System */}
            {activeTab === 'system' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">คำสั่งอัปเดตข้อมูล (Data Update Command)</label>
                  <div className="space-y-3">
                    <div>
                      <div className="flex gap-2 mb-1">
                        <input
                          type="text"
                          readOnly
                          value="npm run sync:thaifin-cache"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono text-xs outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        คำอธิบาย: ใช้สำหรับดึงข้อมูลงบการเงินปีล่าสุดจาก Server มาเก็บไว้ใน Cache (หุ้นที่กำหนด)
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex gap-2 mb-1">
                        <input
                          type="text"
                          readOnly
                          value="python scripts/sync_thaifin_cache.py --all"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono text-xs outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        คำอธิบาย: ใช้สำหรับดึงข้อมูลงบการเงินของ &quot;ทุกหุ้น&quot; ในตลาด (ใช้เวลานานกว่า)
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-700 mb-2">ขั้นตอนการอัปเดตข้อมูล:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-[10px] text-slate-500">
                      <li>เปิด Terminal (หรือ Command Prompt) ในโฟลเดอร์โปรเจกต์</li>
                      <li>พิมพ์คำสั่งด้านบนที่ต้องการ แล้วกด Enter</li>
                      <li>รอจนกว่าระบบจะทำงานเสร็จ (สังเกตข้อความ &quot;Done&quot; หรือ &quot;Success&quot;)</li>
                      <li>รีเฟรชหน้าเว็บเพื่อดูข้อมูลล่าสุด</li>
                    </ol>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => runSync('default')}
                      disabled={isSyncLoading || isClearCacheLoading}
                      className="w-full py-2 px-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {isSyncLoading && syncMode === 'default' && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300"
                          style={{ width: `${syncProgress}%` }}
                        />
                      )}
                      <span className="relative z-10">
                        {isSyncLoading && syncMode === 'default' ? `กำลังอัปเดต... ${syncProgress}%` : 'อัปเดตหุ้นที่กำหนด'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => runSync('all')}
                      disabled={isSyncLoading || isClearCacheLoading}
                      className="w-full py-2 px-3 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {isSyncLoading && syncMode === 'all' && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300"
                          style={{ width: `${syncProgress}%` }}
                        />
                      )}
                      <span className="relative z-10">
                        {isSyncLoading && syncMode === 'all' ? `กำลังอัปเดต... ${syncProgress}%` : 'อัปเดตทุกหุ้น'}
                      </span>
                    </button>
                  </div>

                  {isSyncLoading && syncStatusText && (
                    <div className="mt-2 text-center text-[10px] text-emerald-600 font-medium animate-pulse">
                      {syncStatusText}
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={isClearCacheLoading || isSyncLoading}
                      className="w-full py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
                    >
                      {isClearCacheLoading && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-red-200/50 transition-all duration-100"
                          style={{ width: `${clearProgress}%` }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <Trash2 size={14} />
                        {isClearCacheLoading ? `กำลังเคลียร์แคช... ${clearProgress}%` : 'เคลียร์แคชข้อมูลหุ้น (Clear Cache)'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={testDbConnection}
                    disabled={isTestDbLoading}
                    className="w-full py-2 px-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Database size={16} />
                    {isTestDbLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบการเชื่อมต่อฐานข้อมูล'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Account */}
            {activeTab === 'account' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Key size={16} className="text-slate-500" />
                    เปลี่ยนรหัสผ่าน (Change Password)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="ยืนยันรหัสผ่านใหม่"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={isPasswordChanging || !newPassword || !confirmPassword}
                      className="w-full py-2 px-4 bg-slate-800 text-white rounded-xl text-xs font-medium hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPasswordChanging ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'ยืนยันการเปลี่ยนรหัสผ่าน'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 font-medium transition-all"
                  >
                    <LogOut size={18} />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
            >
              {activeTab === 'notifications' ? 'ยกเลิก' : 'ปิด'}
            </button>
            {activeTab === 'notifications' && (
              <button
                onClick={onSave}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-200 hover:shadow-emerald-300 transition-all flex justify-center items-center gap-2"
              >
                <Save size={18} />
                บันทึก
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
