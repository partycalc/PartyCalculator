import React, { useState, useEffect } from 'react';
import { Share2, Users, Plus, Calculator, CheckCircle, Clock, XCircle, ShoppingCart, Trash2, Edit2, RotateCcw, Mail, HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';

const PartyCalculator = () => {
  const [screen, setScreen] = useState('main');
  const [activeTab, setActiveTab] = useState('participants');
  const [eventName, setEventName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [consumption, setConsumption] = useState({});
  const [newParticipant, setNewParticipant] = useState({ name: '', phone: '' });
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [newPurchase, setNewPurchase] = useState({
    product: '',
    price: '',
    quantity: '',
    buyer: ''
  });
  const [settlements, setSettlements] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetAll = () => {
    setScreen('main');
    setActiveTab('participants');
    setEventName('');
    setParticipants([]);
    setPurchases([]);
    setConsumption({});
    setNewParticipant({ name: '', phone: '' });
    setNewPurchase({
      product: '',
      price: '',
      quantity: '',
      buyer: ''
    });
    setSettlements([]);
    setPaymentStatuses({});
    setShowResetConfirm(false);
  };

  const createEvent = () => {
    if (eventName.trim()) {
      setScreen('tabs');
      setActiveTab('participants');
    }
  };

  const addParticipant = () => {
    if (newParticipant.name.trim() && !participants.find(p => p.name === newParticipant.name)) {
      setParticipants([...participants, { ...newParticipant, id: Date.now() }]);
      setNewParticipant({ name: '', phone: '' });
    }
  };

  const deleteParticipant = (id) => {
    if (!window.confirm('Удалить участника?')) return;
    setParticipants(participants.filter(p => p.id !== id));
  };

  const startEditParticipant = (participant) => {
    setEditingParticipant({ ...participant });
  };

  const saveEditParticipant = () => {
    if (editingParticipant && editingParticipant.name.trim()) {
      setParticipants(participants.map(p => 
        p.id === editingParticipant.id ? editingParticipant : p
      ));
      setEditingParticipant(null);
    }
  };

  const addPurchase = () => {
    if (newPurchase.product && newPurchase.price && newPurchase.quantity && newPurchase.buyer) {
      const price = parseFloat(newPurchase.price);
      const quantity = parseFloat(newPurchase.quantity);
      const total = price * quantity;
      
      setPurchases([...purchases, {
        ...newPurchase,
        price,
        quantity,
        total,
        id: Date.now()
      }]);
      
      setNewPurchase({
        product: '',
        price: '',
        quantity: '',
        buyer: ''
      });
    }
  };

  const deletePurchase = (id) => {
    if (!window.confirm('Удалить покупку?')) return;
    setPurchases(purchases.filter(p => p.id !== id));
  };

  const startEditPurchase = (purchase) => {
    setEditingPurchase({...purchase});
  };

  const saveEditPurchase = () => {
    if (editingPurchase) {
      const price = parseFloat(editingPurchase.price);
      const quantity = parseFloat(editingPurchase.quantity);
      const total = price * quantity;
      
      setPurchases(purchases.map(p => 
        p.id === editingPurchase.id 
          ? {...editingPurchase, price, quantity, total}
          : p
      ));
      setEditingPurchase(null);
    }
  };

  // Группировка покупок по продукту + цена
  const getGroupedPurchases = () => {
    const groups = {};
    purchases.forEach(p => {
      const key = `${p.product}-${p.price}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          product: p.product,
          price: p.price,
          totalQuantity: 0,
          purchases: []
        };
      }
      groups[key].totalQuantity += p.quantity;
      groups[key].purchases.push(p);
    });
    return Object.values(groups);
  };

  // Проверка дубликатов названий
  const getProductDuplicates = () => {
    const map = {};
    purchases.forEach(p => {
      if (!map[p.product]) map[p.product] = new Set();
      map[p.product].add(p.price);
    });
    const result = {};
    Object.keys(map).forEach(name => {
      result[name] = map[name].size;
    });
    return result;
  };

  // Обновление потребления
  const updateConsumption = (groupKey, participantId, value) => {
    const val = parseFloat(value);
    setConsumption({
      ...consumption,
      [`${groupKey}-${participantId}`]: isNaN(val) ? 0 : val
    });
  };

  // Быстрая установка долей
  const quickSet = (groupKey, participantId, fraction, totalQty) => {
    let val = 0;
    if (fraction === '0') {
      val = 0;
    } else if (fraction === 'all') {
      val = totalQty;
    } else if (fraction.includes('/')) {
      const [n, d] = fraction.split('/').map(parseFloat);
      const already = participants.reduce((sum, p) => {
        if (p.id === participantId) return sum;
        return sum + (consumption[`${groupKey}-${p.id}`] || 0);
      }, 0);
      const remaining = totalQty - already;
      const exact = totalQty * n / d;
      val = Math.min(remaining, Math.round(exact * 100) / 100);
    }
    setConsumption({
      ...consumption,
      [`${groupKey}-${participantId}`]: val
    });
  };

  // Распределить один продукт поровну
  const autoDistributeProduct = (groupKey) => {
    const group = getGroupedPurchases().find(g => g.key === groupKey);
    if (!group) return;
    
    const cnt = participants.length;
    const per = group.totalQuantity / cnt;
    let distributed = 0;
    
    const newConsumption = { ...consumption };
    participants.forEach((p, i) => {
      if (i === cnt - 1) {
        newConsumption[`${groupKey}-${p.id}`] = Math.round((group.totalQuantity - distributed) * 100) / 100;
      } else {
        const share = Math.round(per * 100) / 100;
        newConsumption[`${groupKey}-${p.id}`] = share;
        distributed += share;
      }
    });
    setConsumption(newConsumption);
  };

  // Распределить все поровну
  const autoDistributeAll = () => {
    if (!window.confirm('Распределить все продукты поровну?')) return;
    
    const groups = getGroupedPurchases();
    const cnt = participants.length;
    const newConsumption = {};
    
    groups.forEach(group => {
      const per = group.totalQuantity / cnt;
      let distributed = 0;
      
      participants.forEach((p, i) => {
        if (i === cnt - 1) {
          newConsumption[`${group.key}-${p.id}`] = Math.round((group.totalQuantity - distributed) * 100) / 100;
        } else {
          const share = Math.round(per * 100) / 100;
          newConsumption[`${group.key}-${p.id}`] = share;
          distributed += share;
        }
      });
    });
    
    setConsumption(newConsumption);
  };

  // Очистить таблицу потребления
  const clearConsumption = () => {
    if (!window.confirm('Очистить таблицу потребления?')) return;
    setConsumption({});
  };

  // Статус баланса продукта
  const getConsumptionStatus = (groupKey) => {
    const group = getGroupedPurchases().find(g => g.key === groupKey);
    if (!group) return { filled: 0, total: 0, percent: 0, status: 'warn' };
    
    const filled = participants.reduce((sum, p) => {
      return sum + (consumption[`${groupKey}-${p.id}`] || 0);
    }, 0);
    
    const total = group.totalQuantity;
    const percent = (filled / total) * 100;
    
    let status = 'warn';
    if (percent > 100.5) status = 'error';
    else if (percent >= 99.5 && percent <= 100.5) status = 'ok';
    else status = 'warn';
    
    return {
      filled: Math.round(filled * 100) / 100,
      total,
      percent,
      status
    };
  };

  // Детализация покупок
  const getPurchaseDetails = () => {
    const details = {};
    participants.forEach(p => {
      details[p.name] = { spent: 0, purchases: [] };
    });

    purchases.forEach(purchase => {
      if (details[purchase.buyer]) {
        details[purchase.buyer].spent += purchase.total;
        details[purchase.buyer].purchases.push({
          product: purchase.product,
          price: purchase.price,
          quantity: purchase.quantity,
          total: purchase.total
        });
      }
    });

    return details;
  };

  // Расчёт балансов
  const calculateBalances = () => {
    const balances = {};
    participants.forEach(p => {
      balances[p.name] = { spent: 0, owes: 0 };
    });

    // Кто сколько потратил
    purchases.forEach(purchase => {
      balances[purchase.buyer].spent += purchase.total;
    });

    // Кто сколько должен
    const groups = getGroupedPurchases();
    groups.forEach(group => {
      participants.forEach(p => {
        const consumed = consumption[`${group.key}-${p.id}`] || 0;
        balances[p.name].owes += consumed * group.price;
      });
    });

    const debts = [];
    const creditors = [];
    
    Object.entries(balances).forEach(([person, data]) => {
      const balance = data.spent - data.owes;
      if (balance < -0.01) debts.push({ person, amount: -balance });
      if (balance > 0.01) creditors.push({ person, amount: balance });
    });

    const transactions = [];
    let debtIndex = 0;
    let creditorIndex = 0;

    while (debtIndex < debts.length && creditorIndex < creditors.length) {
      const debt = debts[debtIndex];
      const creditor = creditors[creditorIndex];
      const amount = Math.min(debt.amount, creditor.amount);

      if (amount > 0.01) {
        transactions.push({
          from: debt.person,
          to: creditor.person,
          amount: Math.round(amount),
          status: 'unpaid',
          id: `${debt.person}-${creditor.person}`
        });
      }

      debt.amount -= amount;
      creditor.amount -= amount;

      if (debt.amount < 0.01) debtIndex++;
      if (creditor.amount < 0.01) creditorIndex++;
    }

    setSettlements(transactions);
    
    const statuses = {};
    transactions.forEach(t => {
      statuses[t.id] = 'unpaid';
    });
    setPaymentStatuses(statuses);
    
    setActiveTab('settlement');
  };

  const generateShareText = () => {
    let text = `💰 Итоговый расчёт "${eventName}"\n\n`;
    
    settlements.forEach(s => {
      const statusIcon = paymentStatuses[s.id] === 'paid' ? '✅' : 
                        paymentStatuses[s.id] === 'pending' ? '⏳' : '❌';
      text += `${statusIcon} ${s.from} → ${s.to}: ${s.amount}₽\n`;
    });
    
    return text;
  };

  const shareToMessenger = (platform) => {
    const text = encodeURIComponent(generateShareText());
    const links = {
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?text=${text}`,
      viber: `viber://forward?text=${text}`,
      vk: `https://vk.com/share.php?url=${text}`
    };
    
    window.open(links[platform], '_blank');
  };

  const generatePaymentLink = (transaction) => {
    const receiver = participants.find(p => p.name === transaction.to);
    const phone = receiver?.phone || '';
    const comment = encodeURIComponent(`${eventName} - расчёт`);
    
    if (phone) {
      return `https://qr.nspk.ru/m?bank=100000000111&sum=${transaction.amount}&phone=${phone}&comment=${comment}`;
    }
    return `https://qr.nspk.ru/?amount=${transaction.amount}&comment=${comment}`;
  };

  const updatePaymentStatus = (transactionId, status) => {
    setPaymentStatuses({...paymentStatuses, [transactionId]: status});
  };

  // Результаты для отображения
  const getResults = () => {
    const balances = {};
    participants.forEach(p => {
      balances[p.name] = { spent: 0, owes: 0 };
    });

    purchases.forEach(purchase => {
      balances[purchase.buyer].spent += purchase.total;
    });

    const groups = getGroupedPurchases();
    groups.forEach(group => {
      participants.forEach(p => {
        const consumed = consumption[`${group.key}-${p.id}`] || 0;
        balances[p.name].owes += consumed * group.price;
      });
    });

    return Object.entries(balances).map(([name, data]) => ({
      name,
      spent: data.spent,
      owes: data.owes,
      balance: data.spent - data.owes
    }));
  };

  if (screen === 'main') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-indigo-100 rounded-full mb-4">
                <Calculator className="w-12 h-12 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Party Calculator</h1>
              <p className="text-gray-600">Делим расходы на мероприятии</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Название мероприятия (например: ДР Маши 🎂)"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createEvent()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
              
              <button
                onClick={createEvent}
                disabled={!eventName.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Создать мероприятие
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
              <p className="mb-1">Разработчик: Владимир Васякин</p>
              <a 
                href="mailto:e@mailvladimir.ru" 
                className="text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
              >
                <Mail className="w-4 h-4" />
                e@mailvladimir.ru
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'tabs') {
    const tabs = [
      { id: 'participants', label: 'Участники', icon: Users },
      { id: 'purchases', label: 'Покупки', icon: ShoppingCart },
      { id: 'consumption', label: 'Потребление', icon: Calculator },
      { id: 'settlement', label: 'Расчёты', icon: CheckCircle },
      { id: 'help', label: 'Помощь', icon: HelpCircle }
    ];

    const purchaseDetails = getPurchaseDetails();
    const results = getResults();
    const groups = getGroupedPurchases();
    const duplicates = getProductDuplicates();

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-20">
        <div className="max-w-4xl mx-auto mt-6">
          <div className="bg-white rounded-t-2xl shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{eventName}</h2>
                <p className="text-sm text-gray-600">{participants.length} участников</p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Сбросить все"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-max px-3 py-3 font-medium text-xs flex items-center justify-center gap-1 transition ${
                      activeTab === tab.id
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {activeTab === 'participants' && (
                <div>
                  <div className="space-y-2 mb-4">
                    <input
                      type="text"
                      placeholder="Имя участника"
                      value={newParticipant.name}
                      onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Телефон для СБП (необязательно)"
                      value={newParticipant.phone}
                      onChange={(e) => setNewParticipant({...newParticipant, phone: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={addParticipant}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Добавить участника
                    </button>
                  </div>

                  <div className="space-y-2">
                    {participants.map((p) => (
                      <div key={p.id} className="bg-gray-50 px-4 py-3 rounded-lg">
                        {editingParticipant?.id === p.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingParticipant.name}
                              onChange={(e) => setEditingParticipant({...editingParticipant, name: e.target.value})}
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none"
                            />
                            <input
                              type="tel"
                              value={editingParticipant.phone || ''}
                              onChange={(e) => setEditingParticipant({...editingParticipant, phone: e.target.value})}
                              placeholder="Телефон для СБП"
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditParticipant}
                                className="flex-1 bg-green-600 text-white py-1 rounded text-sm"
                              >
                                Сохранить
                              </button>
                              <button
                                onClick={() => setEditingParticipant(null)}
                                className="flex-1 bg-gray-300 text-gray-700 py-1 rounded text-sm"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-700">{p.name}</span>
                              {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditParticipant(p)}
                                className="text-indigo-500 hover:text-indigo-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteParticipant(p.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {participants.length < 2 && (
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      Добавьте минимум 2 участников
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'purchases' && (
                <div>
                  {participants.length < 2 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Сначала добавьте участников</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Новая покупка</h3>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Название продукта"
                            value={newPurchase.product}
                            onChange={(e) => setNewPurchase({...newPurchase, product: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                          />
                          
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Цена"
                              value={newPurchase.price}
                              onChange={(e) => setNewPurchase({...newPurchase, price: e.target.value})}
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Количество"
                              value={newPurchase.quantity}
                              onChange={(e) => setNewPurchase({...newPurchase, quantity: e.target.value})}
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                            />
                          </div>

                          {newPurchase.price && newPurchase.quantity && (
                            <div className="bg-white px-3 py-2 rounded-lg">
                              <span className="text-sm text-gray-600">Сумма: </span>
                              <span className="font-bold text-indigo-600">
                                {(parseFloat(newPurchase.price) * parseFloat(newPurchase.quantity)).toFixed(2)}₽
                              </span>
                            </div>
                          )}

                          <select
                            value={newPurchase.buyer}
                            onChange={(e) => setNewPurchase({...newPurchase, buyer: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="">Кто купил?</option>
                            {participants.map(p => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>

                          <button
                            onClick={addPurchase}
                            disabled={!newPurchase.product || !newPurchase.price || !newPurchase.quantity || !newPurchase.buyer}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300"
                          >
                            Добавить покупку
                          </button>
                        </div>
                      </div>

                      {purchases.length > 0 && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-gray-700 mb-3">📦 Детализация покупок</h3>
                          {Object.entries(purchaseDetails).map(([person, data]) => (
                            data.purchases.length > 0 && (
                              <div key={person} className="bg-gray-50 p-3 rounded-lg mb-2">
                                <p className="font-medium text-gray-800">{person} 🧑</p>
                                {data.purchases.map((p, i) => (
                                  <p key={i} className="text-xs text-gray-600">
                                    {p.product}: {p.price}₽ × {p.quantity} = {p.total.toFixed(2)}₽
                                  </p>
                                ))}
                                <p className="text-sm font-bold text-indigo-600 mt-1">
                                  Потратил: {data.spent.toFixed(2)}₽
                                </p>
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-700">Все покупки</h3>
                        {purchases.map((purchase) => (
                          <div key={purchase.id} className="bg-gray-50 p-3 rounded-lg">
                            {editingPurchase?.id === purchase.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingPurchase.product}
                                  onChange={(e) => setEditingPurchase({...editingPurchase, product: e.target.value})}
                                  className="w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    value={editingPurchase.price}
                                    onChange={(e) => setEditingPurchase({...editingPurchase, price: e.target.value})}
                                    className="px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    value={editingPurchase.quantity}
                                    onChange={(e) => setEditingPurchase({...editingPurchase, quantity: e.target.value})}
                                    className="px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveEditPurchase}
                                    className="flex-1 bg-green-600 text-white py-1 rounded text-sm"
                                  >
                                    Сохранить
                                  </button>
                                  <button
                                    onClick={() => setEditingPurchase(null)}
                                    className="flex-1 bg-gray-300 text-gray-700 py-1 rounded text-sm"
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-800">{purchase.product}</p>
                                    <p className="text-xs text-gray-600">
                                      {purchase.price}₽ × {purchase.quantity} = {purchase.total.toFixed(2)}₽
                                    </p>
                                    <p className="text-xs text-gray-600">Купил: {purchase.buyer}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => startEditPurchase(purchase)}
                                      className="text-indigo-500 hover:text-indigo-700"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deletePurchase(purchase.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {purchases.length === 0 && (
                        <p className="text-sm text-gray-500 mt-4 text-center">
                          Пока нет покупок
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'consumption' && (
                <div>
                  {purchases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Сначала добавьте покупки</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-100 p-3 rounded-lg mb-4">
                        <h3 className="font-semibold text-gray-700 mb-2">Быстрое распределение</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={autoDistributeAll}
                            className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                          >
                            Всё поровну
                          </button>
                          <button
                            onClick={clearConsumption}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-400"
                          >
                            Очистить всё
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-300">
                              <th className="sticky left-0 z-10 bg-white p-2 text-left font-semibold text-gray-700 border-r border-gray-200">
                                Участник
                              </th>
                              {groups.map(group => {
                                const status = getConsumptionStatus(group.key);
                                const showPrice = (duplicates[group.product] || 0) > 1;
                                
                                return (
                                  <th key={group.key} className="p-2 text-center min-w-[200px]">
                                    <div className="space-y-1">
                                      <div className="font-semibold text-gray-800">
                                        {group.product}
                                        {showPrice && (
                                          <div className="text-xs text-gray-500 font-normal">
                                            ({group.price}₽)
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => autoDistributeProduct(group.key)}
                                        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                                      >
                                        Поровну
                                      </button>
                                      <div className={`text-xs font-bold ${
                                        status.status === 'ok' ? 'text-green-600' :
                                        status.status === 'error' ? 'text-red-600' :
                                        'text-yellow-600'
                                      }`}>
                                        {status.status === 'ok' && '✓'}
                                        {status.status === 'error' && '⚠'}
                                        {status.status === 'warn' && '⚠'}
                                        {' '}{status.filled} / {status.total} шт
                                        {status.status === 'error' && ' (перебор!)'}
                                        {status.status === 'warn' && status.filled > 0 && ' (недозаполнено)'}
                                      </div>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {participants.map(p => (
                              <tr key={p.id} className="border-b border-gray-200">
                                <td className="sticky left-0 z-10 bg-white p-2 font-semibold text-gray-700 border-r border-gray-200">
                                  {p.name}
                                </td>
                                {groups.map(group => {
                                  const key = `${group.key}-${p.id}`;
                                  const value = consumption[key] || 0;
                                  const displayValue = value ? String(value) : '';
                                  
                                  return (
                                    <td key={group.key} className="p-2">
                                      <div className="flex flex-col gap-1 items-center">
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          placeholder="0"
                                          value={displayValue}
                                          onChange={(e) => updateConsumption(group.key, p.id, e.target.value)}
                                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                        />
                                        <select
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              quickSet(group.key, p.id, e.target.value, group.totalQuantity);
                                              e.target.value = '';
                                            }
                                          }}
                                          className="w-20 px-1 py-1 text-xs border border-gray-300 rounded"
                                        >
                                          <option value="">Доля</option>
                                          <option value="0">Не ел</option>
                                          {Array.from({ length: participants.length }, (_, i) => participants.length - i).map(d => (
                                            <option key={d} value={`1/${d}`}>1/{d}</option>
                                          ))}
                                          <option value="all">Всё</option>
                                        </select>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'settlement' && (
                <div>
                  {purchases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calculator className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Добавьте покупки для расчёта</p>
                    </div>
                  ) : settlements.length === 0 ? (
                    <div className="text-center py-8">
                      <button
                        onClick={calculateBalances}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 inline-flex items-center gap-2"
                      >
                        <Calculator className="w-5 h-5" />
                        Рассчитать балансы
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          💰 Баланс расчётов
                        </h3>
                        {results.map(res => {
                          const isOverpaid = res.balance > 0.01;
                          const isUnderpaid = res.balance < -0.01;
                          
                          return (
                            <div key={res.name} className={`p-3 rounded-lg mb-2 ${
                              isOverpaid ? 'bg-green-50 border-2 border-green-200' : 
                              isUnderpaid ? 'bg-red-50 border-2 border-red-200' : 
                              'bg-gray-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-800">{res.name}</p>
                                  <p className="text-xs text-gray-600">
                                    Потратил: {res.spent.toFixed(2)}₽ | Должен был: {res.owes.toFixed(2)}₽
                                  </p>
                                </div>
                                <div className="text-right">
                                  {isOverpaid && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <TrendingUp className="w-4 h-4" />
                                      <span className="font-bold">+{res.balance.toFixed(2)}₽</span>
                                    </div>
                                  )}
                                  {isUnderpaid && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <TrendingDown className="w-4 h-4" />
                                      <span className="font-bold">{res.balance.toFixed(2)}₽</span>
                                    </div>
                                  )}
                                  {!isOverpaid && !isUnderpaid && (
                                    <span className="text-gray-500 text-sm">Баланс 0₽</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {isOverpaid && '✅ Переплатил - ему вернут'}
                                {isUnderpaid && '❌ Недоплатил - должен доплатить'}
                                {!isOverpaid && !isUnderpaid && '✓ Всё оплачено'}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          🎯 Итоговые переводы
                        </h3>
                        <div className="space-y-3">
                          {settlements.map((transaction) => {
                            const status = paymentStatuses[transaction.id];
                            const statusConfig = {
                              unpaid: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', text: 'Не оплачено' },
                              pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', text: 'Ожидает подтверждения' },
                              paid: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', text: 'Оплачено' }
                            }[status];
                            
                            const StatusIcon = statusConfig.icon;
                            const receiver = participants.find(p => p.name === transaction.to);

                            return (
                              <div key={transaction.id} className={`${statusConfig.bg} p-4 rounded-lg border-2 ${status === 'paid' ? 'border-green-200' : 'border-transparent'}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="font-semibold text-gray-800">
                                      {transaction.from} → {transaction.to}
                                    </p>
                                    <p className="text-2xl font-bold text-indigo-600">{transaction.amount}₽</p>
                                    {receiver?.phone && (
                                      <p className="text-xs text-gray-500">СБП: {receiver.phone}</p>
                                    )}
                                  </div>
                                  <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
                                </div>
                                
                                <div className="flex gap-2">
                                  {status === 'unpaid' && (
                                    <>
                                      {receiver?.phone ? (
                                        <button
                                          onClick={() => {
                                            const link = generatePaymentLink(transaction);
                                            window.open(link, '_blank');
                                            updatePaymentStatus(transaction.id, 'pending');
                                          }}
                                          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                                        >
                                          Оплатить через СБП
                                        </button>
                                      ) : (
                                        <div className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-lg text-xs text-center">
                                          Укажите телефон получателя для СБП
                                        </div>
                                      )}
                                      <button
                                        onClick={() => updatePaymentStatus(transaction.id, 'paid')}
                                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300"
                                      >
                                        Уже оплатил
                                      </button>
                                    </>
                                  )}
                                  
                                  {status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => updatePaymentStatus(transaction.id, 'paid')}
                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                                      >
                                        ✓ Подтвердить
                                      </button>
                                      <button
                                        onClick={() => updatePaymentStatus(transaction.id, 'unpaid')}
                                        className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-200"
                                      >
                                        ✗ Не получил
                                      </button>
                                    </>
                                  )}
                                  
                                  {status === 'paid' && (
                                    <div className="w-full text-center text-green-700 font-semibold py-2">
                                      ✓ Оплата подтверждена
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t-2 border-gray-200 pt-4">
                        <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Share2 className="w-5 h-5" />
                          Отправить расчёт через:
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <button
                            onClick={() => shareToMessenger('whatsapp')}
                            className="bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600"
                          >
                            WhatsApp
                          </button>
                          <button
                            onClick={() => shareToMessenger('telegram')}
                            className="bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600"
                          >
                            Telegram
                          </button>
                          <button
                            onClick={() => shareToMessenger('viber')}
                            className="bg-purple-500 text-white py-2 rounded-lg font-semibold hover:bg-purple-600"
                          >
                            Viber
                          </button>
                          <button
                            onClick={() => shareToMessenger('vk')}
                            className="bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800"
                          >
                            VK
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setSettlements([]);
                            setPaymentStatuses({});
                          }}
                          className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
                        >
                          Пересчитать заново
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'help' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5" />
                      Как пользоваться
                    </h3>
                    <ol className="text-sm text-gray-700 space-y-2">
                      <li><strong>1. Участники</strong> — добавьте всех, кто участвует в мероприятии. Укажите телефон для оплаты через СБП.</li>
                      <li><strong>2. Покупки</strong> — вносите все расходы: что купили, кто заплатил, количество.</li>
                      <li><strong>3. Потребление</strong> — укажите кто сколько съел/выпил. Можно вводить числа или выбирать доли (1/2, 1/3 и т.д.)</li>
                      <li><strong>4. Расчёты</strong> — нажмите "Рассчитать балансы" для автоматического расчёта переводов.</li>
                    </ol>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">💡 Полезные фишки</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Продукты с одной ценой объединяются в один столбец</li>
                      <li>• Кнопки "Поровну" автоматически распределяют продукты</li>
                      <li>• Цветовая индикация: 🟢 = ОК, 🟡 = недозаполнено, 🔴 = перебор</li>
                      <li>• Доли (1/2, 1/3) автоматически учитывают остальных участников</li>
                      <li>• СБП работает, если указан телефон получателя</li>
                      <li>• Можно отправить итоги в любой мессенджер</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Важно знать</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Минимум 2 участника для работы</li>
                      <li>• При делении на доли последний получает остаток (решает проблему 0.33+0.33+0.33=0.99)</li>
                      <li>• Данные хранятся только в текущей сессии браузера</li>
                      <li>• При закрытии приложения всё удалится</li>
                      <li>• Кнопка "Сброс" удаляет ВСЕ данные безвозвратно</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-2">Вопросы или предложения?</p>
                    <a 
                      href="mailto:e@mailvladimir.ru" 
                      className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1"
                    >
                      <Mail className="w-4 h-4" />
                      e@mailvladimir.ru
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Разработчик: Владимир Васякин</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Точно все сбросить?</h3>
              <p className="text-gray-600 mb-6">
                Все данные о мероприятии, участниках и покупках будут удалены. Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Отмена
                </button>
                <button
                  onClick={resetAll}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
                >
                  Да, сбросить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default PartyCalculator;
