import { useState, useEffect, useCallback } from 'react';
import { calculateDDM } from '@/lib/calculations';

export function useNotifications() {
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('telegramBotToken');
    const savedChatId = localStorage.getItem('telegramChatId');
    if (savedToken) setTelegramBotToken(savedToken);
    if (savedChatId) setTelegramChatId(savedChatId);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('telegramBotToken', telegramBotToken);
    localStorage.setItem('telegramChatId', telegramChatId);
  };

  const sendTelegramMessage = useCallback(async (text: string) => {
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: text,
          parse_mode: 'Markdown'
        }),
      });
    } catch (err) {
      console.error('Failed to send Telegram message', err);
    }
  }, [telegramBotToken, telegramChatId]);

  const checkPriceAlerts = useCallback(async (
    items: any[], 
    setIsLoadingData: (v: boolean) => void,
    silent = false,
  ) => {
    if (items.length === 0) return { updatedPortfolio: items, hasUpdates: false };
    
    setIsLoadingData(true);
    let alertMessages: string[] = [];
    let hasUpdates = false;

    // Request Notification permission if needed
    if (!silent && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    try {
      const updatedPortfolio = await Promise.all(items.map(async (item) => {
        try {
          // Fetch latest price
          const res = await fetch(`/api/stock?ticker=${item.ticker}`);
          const data = await res.json();
          
          if (!res.ok) return item; // Keep old data if fetch fails
          
          const latestPrice = data.currentPrice;
          const d0Value = typeof data.d0 === 'number' ? data.d0 : (typeof item.d0 === 'number' ? item.d0 : 0);
          
          let gValue = typeof item.g === 'number' ? item.g : parseFloat(item.g || '0');
          // Align g rounding logic with Single Stock and Multi-Screening
          const gCalcRoundedStr = (gValue * 100).toFixed(2);
          gValue = parseFloat(gCalcRoundedStr) / 100;
          
          const ksValue = typeof item.ks === 'number' ? item.ks : parseFloat(item.ks || '0.1');
          const yearsValue = 5;
          const canRecalculate = Number.isFinite(d0Value) && Number.isFinite(gValue) && Number.isFinite(ksValue) && ksValue > 0 && gValue < ksValue;
          const ddmResult = canRecalculate
            ? calculateDDM(item.ticker, d0Value, gValue, ksValue, yearsValue, latestPrice)
            : null;
          const fairPrice = ddmResult?.fairPrice ?? (item.fair_price || 0);
          const mos30Price = fairPrice > 0 ? fairPrice * 0.7 : 0;
          const mos40Price = fairPrice > 0 ? fairPrice * 0.6 : 0;
          const mos50Price = fairPrice > 0 ? fairPrice * 0.5 : 0;
          let statusLabel = '-';
          if (latestPrice > 0 && fairPrice > 0) {
            if (latestPrice <= mos50Price) statusLabel = 'MOS 50%';
            else if (latestPrice <= mos40Price) statusLabel = 'MOS 40%';
            else if (latestPrice <= mos30Price) statusLabel = 'MOS 30%';
            else if (latestPrice < fairPrice) statusLabel = 'ต่ำกว่า FV';
            else statusLabel = 'รอก่อนนะ';
          }
          
          // Check for alerts
          let alertLevel = '';
          if (item.target_price && latestPrice <= item.target_price) alertLevel = `Target Price (${item.target_price})`;
          else if (latestPrice <= mos50Price) alertLevel = 'MOS 50%';
          else if (latestPrice <= mos40Price) alertLevel = 'MOS 40%';
          else if (latestPrice <= mos30Price) alertLevel = 'MOS 30%';
          
          if (alertLevel) {
            const msg = `🚨 *${item.ticker}* ราคา ${latestPrice.toFixed(2)} บาท\nแตะระดับ ${alertLevel} (Fair: ${fairPrice.toFixed(2)})`;
            alertMessages.push(msg);
          }

          // Always enrich item with fresh financial data
          // This ensures we display values even if they aren't saved in DB yet
          const updatedItem = {
            ...item,
            current_price: latestPrice,
            d0: d0Value,
            fair_price: fairPrice,
            mos30_price: mos30Price,
            mos40_price: mos40Price,
            mos50_price: mos50Price,
            status: statusLabel,
            roe: data.roe,
            roa: data.roa,
            eps: data.eps,
            debt_to_equity: data.debtToEquity,
            pbv: data.pbv,
            pe: data.pe,
            yield: data.dividendYield
          };

          hasUpdates = true;

          // Update Supabase
          // 1. Always update price (critical)
          if (
            latestPrice !== item.current_price ||
            fairPrice !== item.fair_price ||
            mos30Price !== item.mos30_price ||
            mos40Price !== item.mos40_price ||
            mos50Price !== item.mos50_price ||
            statusLabel !== item.status
          ) {
            fetch('/api/portfolio', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: item.id,
                current_price: latestPrice,
                fair_price: fairPrice,
                mos30_price: mos30Price,
                mos40_price: mos40Price,
                mos50_price: mos50Price,
                status: statusLabel
              })
            }).catch(err => console.error(`Error updating price for ${item.ticker}`, err));
          }
          
          // 2. Try to update other fields (might fail if columns don't exist in DB)
          // We do this separately to ensure price update always succeeds
          if (data.d0 !== undefined) {
             fetch('/api/portfolio', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                id: item.id,
                d0: d0Value,
                roe: data.roe,
                roa: data.roa,
                eps: data.eps,
                de: data.debtToEquity, // Changed from debt_to_equity to de to match DB column
                pbv: data.pbv,
                pe: data.pe,
                dividend_yield: data.dividendYield
              })
            }).catch(err => console.warn(`Could not persist extended data for ${item.ticker}`, err));
          }

          return updatedItem;
        } catch (err) {
          console.error(`Error checking ${item.ticker}`, err);
          return item;
        }
      }));

      // Send Notifications
      if (alertMessages.length > 0) {
        // 1. Web Notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Two-Stage DDM Alert', {
            body: `พบหุ้นน่าสนใจ ${alertMessages.length} ตัว! คลิกเพื่อดูรายละเอียด`,
          });
        }

        // 2. Telegram Notification
        if (telegramBotToken && telegramChatId) {
          const text = `🔥 *Two-Stage Price Alert*\n\n${alertMessages.join('\n\n')}`;
          await sendTelegramMessage(text);
        }
        
        // Show in-app alert as well (only if not silent)
        if (!silent) {
            alert(`พบหุ้นถึงราคาเป้าหมาย ${alertMessages.length} ตัว!\nตรวจสอบรายละเอียดใน Telegram หรือหน้า Portfolio`);
        }
      } else if (!silent) {
        alert('ตรวจสอบราคาล่าสุดแล้ว ยังไม่พบหุ้นที่ถึงราคาเป้าหมาย (MOS 30% ขึ้นไป)');
      }

      return { updatedPortfolio, hasUpdates };
    } catch (err) {
      console.error('Error checking prices', err);
      if (!silent) alert('เกิดข้อผิดพลาดในการตรวจสอบราคา');
      return { updatedPortfolio: items, hasUpdates: false };
    } finally {
      setIsLoadingData(false);
    }
  }, [telegramBotToken, telegramChatId, sendTelegramMessage]);

  return {
    telegramBotToken,
    setTelegramBotToken,
    telegramChatId,
    setTelegramChatId,
    saveSettings,
    checkPriceAlerts
  };
}
