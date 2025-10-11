import React, { useState, useEffect } from 'react';
import { Share2, Users, Plus, Calculator, CheckCircle, Clock, XCircle, ShoppingCart, Trash2, Edit2, RotateCcw, Info, TrendingUp, TrendingDown, Copy } from 'lucide-react';

const PartyCalculator = () => {
  const [screen, setScreen] = useState('splash');
  const [activeTab, setActiveTab] = useState('participants');
  const [eventName, setEventName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [consumption, setConsumption] = useState({});
  const [newParticipant, setNewParticipant] = useState({ name: '' });
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
  const [showHelp, setShowHelp] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const isTelegramApp = () => {
    return window.Telegram?.WebApp?.initData !== undefined;
  };

  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        setScreen('main');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const resetAll = () => {
    setScreen('main');
    setActiveTab('participants');
    setEventName('');
    setParticipants([]);
    setPurchases([]);
    setConsumption({});
    setNewParticipant({ name: '' });
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
      if (Object.keys(consumption).length > 0) {
        if (!window.confirm('⚠️ Вы уже распределили потребление. При добавлении нового участника вам нужно будет указать его долю. Продолжить?')) {
          return;
        }
      }
      setParticipants([...participants, { name: newParticipant.name, id: Date.now() }]);
      setNewParticipant({ name: '' });
    }
  };

  const deleteParticipant = (id) => {
    if (!window.confirm('Удалить участника?')) return;
    setParticipants(participants.filter(p => p.id !== id));
    const newConsumption = { ...consumption };
    Object.keys(newConsumption).forEach(key => {
      delete newConsumption[key][id];
    });
    setConsumption(newConsumption);
  };

  const startEditParticipant = (p) => {
    setEditingParticipant({ id: p.id, name: p.name });
  };

  const saveEditParticipant = () => {
    if (editingParticipant && editingParticipant.name.trim()) {
      setParticipants(participants.map(p =>
        p.id === editingParticipant.id ? { ...p, name: editingParticipant.name } : p
      ));
      setEditingParticipant(null);
    }
  };

  const addPurchase = () => {
    if (newPurchase.product && newPurchase.price && newPurchase.quantity && newPurchase.buyer) {
      setPurchases([...purchases, { ...newPurchase, id: Date.now() }]);
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
    const newConsumption = { ...consumption };
    delete newConsumption[id];
    setConsumption(newConsumption);
  };

  const startEditPurchase = (p) => {
    setEditingPurchase({ ...p });
  };

  const saveEditPurchase = () => {
    if (editingPurchase) {
      setPurchases(purchases.map(p =>
        p.id === editingPurchase.id ? editingPurchase : p
      ));
      setEditingPurchase(null);
    }
  };

  const updateConsumption = (purchaseId, participantId, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setConsumption(prev => ({
      ...prev,
      [purchaseId]: {
        ...prev[purchaseId],
        [participantId]: numValue
      }
    }));
  };

  const quickSet = (purchaseId, participantId, option, totalQuantity) => {
    let value = 0;
    if (option === '0') {
      value = 0;
    } else if (option === 'all') {
      value = totalQuantity;
    } else if (option.includes('/')) {
      const parts = option.split('/');
      value = totalQuantity / parseInt(parts[1]);
    }
    updateConsumption(purchaseId, participantId, value.toString());
  };

  const groupPurchases = () => {
    const groups = {};
    purchases.forEach(p => {
      if (!groups[p.product]) {
        groups[p.product] = [];
      }
      groups[p.product].push(p);
    });
    
    return Object.entries(groups).map(([product, items]) => ({
      product,
      key: items[0].id,
      items,
      totalQuantity: items.reduce((sum, item) => sum + parseFloat(item.quantity), 0),
      totalPrice: items.reduce((sum, item) => sum + parseFloat(item.price) * parseFloat(item.quantity), 0)
    }));
  };

  const calculateSettlements = () => {
    const balances = {};
    participants.forEach(p => {
      balances[p.id] = { name: p.name, spent: 0, owes: 0 };
    });

    purchases.forEach(purchase => {
      const buyerId = participants.find(p => p.name === purchase.buyer)?.id;
      if (buyerId) {
        balances[buyerId].spent += parseFloat(purchase.price) * parseFloat(purchase.quantity);
      }

      const consumed = consumption[purchase.id] || {};
      const totalConsumed = Object.values(consumed).reduce((sum, val) => sum + val, 0);
      
      if (totalConsumed > 0) {
        const pricePerUnit = parseFloat(purchase.price);
        Object.entries(consumed).forEach(([participantId, quantity]) => {
          if (quantity > 0) {
            balances[participantId].owes += quantity * pricePerUnit;
          }
        });
      }
    });

    const creditors = [];
    const debtors = [];

    Object.entries(balances).forEach(([id, data]) => {
      const balance = data.spent - data.owes;
      if (balance > 0.01) {
        creditors.push({ id, name: data.name, amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ id, name: data.name, amount: -balance });
      }
    });

    const transfers = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.01) {
        transfers.push({
          from: debtor.name,
          fromId: debtor.id,
          to: creditor.name,
          toId: creditor.id,
          amount: Math.round(amount * 100) / 100
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    setSettlements(transfers);
    return Object.entries(balances).map(([id, data]) => ({
      id,
      name: data.name,
      spent: Math.round(data.spent * 100) / 100,
      owes: Math.round(data.owes * 100) / 100,
      balance: Math.round((data.spent - data.owes) * 100) / 100
    }));
  };

  const handleSBPPayment = (transfer) => {
    if (isTelegramApp() && window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(
        `Для оплаты ${transfer.amount}₽ пользователю ${transfer.to}:\n\n` +
        `1. Откройте ваше банковское приложение\n` +
        `2. Выберите "Перевод по СБП"\n` +
        `3. Введите сумму ${transfer.amount}₽\n\n` +
        `После оплаты нажмите "Уже оплатил"`,
        () => {
          setPaymentStatuses(prev => ({
            ...prev,
            [`${transfer.fromId}-${transfer.toId}`]: 'pending'
          }));
        }
      );
    } else {
      const amount = Math.round(transfer.amount * 100);
      const sbpUrl = `https://qr.nspk.ru/proxyapp.htm?redirectUrl=sbp://pay?amount=${amount}`;
      
      try {
        window.open(sbpUrl, '_blank');
        setPaymentStatuses(prev => ({
          ...prev,
          [`${transfer.fromId}-${transfer.toId}`]: 'pending'
        }));
      } catch (e) {
        alert(`Не удалось открыть СБП. Переведите ${transfer.amount}₽ пользователю ${transfer.to} вручную через банковское приложение.`);
      }
    }
  };

  const handlePaymentConfirm = (transfer) => {
    setPaymentStatuses(prev => ({
      ...prev,
      [`${transfer.fromId}-${transfer.toId}`]: 'paid'
    }));
  };

  const handlePaymentCancel = (transfer) => {
    setPaymentStatuses(prev => ({
      ...prev,
      [`${transfer.fromId}-${transfer.toId}`]: 'unpaid'
    }));
  };

  const copyEmail = () => {
    navigator.clipboard.writeText('e@mailvladimir.ru').then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const calculateFairDistribution = () => {
    const groups = groupPurchases();
    const distribution = {};
    
    groups.forEach(group => {
      const consumed = consumption[group.key] || {};
      const totalConsumed = Object.values(consumed).reduce((sum, val) => sum + val, 0);
      
      if (totalConsumed > 0) {
        const pricePerUnit = group.totalPrice / group.totalQuantity;
        Object.entries(consumed).forEach(([participantId, quantity]) => {
          if (quantity > 0) {
            const participantName = participants.find(p => p.id === parseInt(participantId))?.name;
            if (participantName) {
              if (!distribution[participantName]) {
                distribution[participantName] = 0;
              }
              distribution[participantName] += quantity * pricePerUnit;
            }
          }
        });
      }
    });

    return distribution;
  };

  const getTopExpenses = () => {
    const productTotals = {};
    
    purchases.forEach(p => {
      const total = parseFloat(p.price) * parseFloat(p.quantity);
      if (!productTotals[p.product]) {
        productTotals[p.product] = 0;
      }
      productTotals[p.product] += total;
    });

    return Object.entries(productTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  if (screen === 'splash') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-8 animate-bounce">
            <div className="text-8xl">🎉</div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Party Calculator</h1>
          <p className="text-xl text-white/90">
            Интерактивный калькулятор расходов<br />
            для вечеринок, пикников и поездок
          </p>
          <div className="mt-8">
            <div className="inline-block animate-pulse">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="text-white/70 text-sm mt-4">Добавь участников, покупки и получи идеальный расчёт без споров 💰</p>
        </div>
      </div>
    );
  }

  if (screen === 'main') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Party Calculator</h1>
              <p className="text-gray-600">Честный расчёт расходов для вашей вечеринки</p>
            </div>
            <input
              type="text"
              placeholder="Название мероприятия"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createEvent()}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none mb-4"
            />
            <button
              onClick={createEvent}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-semibold"
            >
              Создать мероприятие
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'participants', label: 'Участники', icon: Users },
    { id: 'purchases', label: 'Покупки', icon: ShoppingCart },
    { id: 'consumption', label: 'Потребление', icon: Calculator },
    { id: 'settlement', label: 'Расчёты', icon: TrendingUp }
  ];

  const balances = calculateSettlements();
  const fairDistribution = calculateFairDistribution();
  const topExpenses = getTopExpenses();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">{eventName}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-2 flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-20">
        {activeTab === 'participants' && (
          <div>
            <div className="space-y-2 mb-4">
              <input
                type="text"
                placeholder="Имя участника"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant({name: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
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
                <div key={p.id} className="bg-white px-4 py-3 rounded-lg shadow-sm">
                  {editingParticipant?.id === p.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingParticipant.name}
                        onChange={(e) => setEditingParticipant({...editingParticipant, name: e.target.value})}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      />
                      <button
                        onClick={saveEditParticipant}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingParticipant(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditParticipant(p)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteParticipant(p.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div>
            {participants.length < 2 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Добавьте минимум 2 участников</p>
              </div>
            ) : (
              <div>
                <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                  <input
                    type="text"
                    placeholder="Название продукта"
                    value={newPurchase.product}
                    onChange={(e) => setNewPurchase({...newPurchase, product: e.target.value})}
                    className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Цена за шт"
                      value={newPurchase.price}
                      onChange={(e) => setNewPurchase({...newPurchase, price: e.target.value})}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Количество"
                      value={newPurchase.quantity}
                      onChange={(e) => setNewPurchase({...newPurchase, quantity: e.target.value})}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <select
                    value={newPurchase.buyer}
                    onChange={(e) => setNewPurchase({...newPurchase, buyer: e.target.value})}
                    className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Кто купил?</option>
                    {participants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={addPurchase}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Добавить покупку
                  </button>
                </div>

                <div className="space-y-2">
                  {purchases.map((p) => (
                    <div key={p.id} className="bg-white px-4 py-3 rounded-lg shadow-sm">
                      {editingPurchase?.id === p.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingPurchase.product}
                            onChange={(e) => setEditingPurchase({...editingPurchase, product: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              value={editingPurchase.price}
                              onChange={(e) => setEditingPurchase({...editingPurchase, price: e.target.value})}
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              value={editingPurchase.quantity}
                              onChange={(e) => setEditingPurchase({...editingPurchase, quantity: e.target.value})}
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEditPurchase}
                              className="flex-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={() => setEditingPurchase(null)}
                              className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-800">{p.product}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditPurchase(p)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deletePurchase(p.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {p.price}₽ × {p.quantity} = {(parseFloat(p.price) * parseFloat(p.quantity)).toFixed(2)}₽
                          </div>
                          <div className="text-xs text-gray-500">Купил: {p.buyer}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'consumption' && (
          <div>
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Добавьте покупки для распределения</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left text-sm font-semibold">Продукт</th>
                        {participants.map(p => (
                          <th key={p.id} className="p-2 text-center text-sm font-semibold">{p.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupPurchases().map(group => (
                        <tr key={group.key} className="border-b">
                          <td className="p-2 font-medium">
                            {group.product}
                            <div className="text-xs text-gray-500">
                              Всего: {group.totalQuantity.toFixed(2)}
                            </div>
                          </td>
                          {participants.map(p => {
                            const value = consumption[group.key]?.[p.id] || 0;
                            const displayValue = value > 0 ? String(value) : '';
                            
                            return (
                              <td key={p.id} className="p-2">
                                <div className="flex flex-col gap-1 items-center">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
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

                {Object.keys(consumption).length > 0 && Object.keys(fairDistribution).length > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎯</span>
                      <h3 className="font-bold text-gray-800">Честное распределение по потреблению</h3>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(fairDistribution)
                        .sort(([, a], [, b]) => b - a)
                        .map(([name, amount]) => (
                          <div key={name} className="flex justify-between items-center">
                            <span className="font-medium">• {name}</span>
                            <span className="font-bold text-gray-800">{amount.toFixed(2)}₽</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-yellow-300 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Всего поделено:</span>
                        <span className="font-bold">
                          {Object.values(fairDistribution).reduce((sum, val) => sum + val, 0).toFixed(2)}₽
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📦</span>
                    <h3 className="font-bold text-gray-800">Детализация покупок</h3>
                  </div>
                  {groupPurchases().map((group, idx) => (
                    <div key={group.key} className="mb-3">
                      <div className="font-bold text-gray-800 mb-1">
                        {idx + 1}. {group.product}
                      </div>
                      {group.items.map((item, itemIdx) => (
                        <div key={item.id} className="text-sm text-gray-600 ml-4">
                          Покупка #{itemIdx + 1}: {item.price}₽ × {item.quantity} = {(parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2)}₽
                        </div>
                      ))}
                      <div className="text-sm font-bold text-indigo-600 ml-4 mt-1">
                        Потратил: {group.totalPrice.toFixed(2)}₽
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                  onClick={calculateSettlements}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 font-semibold"
                >
                  Рассчитать переводы
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">💰</span>
                    <h3 className="font-bold text-gray-800 text-lg">Общие расходы</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg">
                      <div className="text-sm opacity-90 mb-1">Всего потрачено</div>
                      <div className="text-3xl font-bold">
                        {purchases.reduce((sum, p) => sum + parseFloat(p.price) * parseFloat(p.quantity), 0).toFixed(2)}₽
                      </div>
                    </div>
                    
                    {topExpenses.map(([product, amount], idx) => {
                      const colors = [
                        'from-pink-500 to-rose-500',
                        'from-blue-500 to-cyan-500',
                        'from-orange-500 to-amber-500'
                      ];
                      return (
                        <div key={product} className={`bg-gradient-to-br ${colors[idx]} text-white p-4 rounded-xl shadow-lg`}>
                          <div className="text-xs opacity-90 mb-1 truncate">{product}</div>
                          <div className="text-2xl font-bold">{amount.toFixed(2)}₽</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">Балансы участников</h3>
                  {balances.map(b => (
                    <div key={b.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <span className="font-medium">{b.name}</span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Потратил: {b.spent.toFixed(2)}₽ | Должен был: {b.owes.toFixed(2)}₽
                        </div>
                        <div className={`font-bold ${b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {b.balance > 0 ? '+' : ''}{b.balance.toFixed(2)}₽
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Итоговые переводы
                </h3>
                <div className="space-y-3">
                  {settlements.map((transfer, index) => {
                    const statusKey = `${transfer.fromId}-${transfer.toId}`;
                    const status = paymentStatuses[statusKey] || 'unpaid';
                    
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border-2 ${
                          status === 'paid' 
                            ? 'bg-green-50 border-green-300' 
                            : status === 'pending'
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-red-50 border-red-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-bold text-gray-800 mb-1">
                              {transfer.from} → {transfer.to}
                            </div>
                            <div className="text-2xl font-bold text-indigo-600">
                              {transfer.amount.toFixed(2)}₽
                            </div>
                          </div>
                          {status === 'paid' ? (
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          ) : status === 'pending' ? (
                            <Clock className="w-8 h-8 text-blue-600" />
                          ) : (
                            <XCircle className="w-8 h-8 text-red-600" />
                          )}
                        </div>

                        {status === 'unpaid' && (
                          <button
                            onClick={() => handleSBPPayment(transfer)}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold mb-2"
                          >
                            Оплатить через СБП
                          </button>
                        )}

                        {status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePaymentConfirm(transfer)}
                              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Уже оплатил
                            </button>
                            <button
                              onClick={() => handlePaymentCancel(transfer)}
                              className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 font-semibold"
                            >
                              Отмена
                            </button>
                          </div>
                        )}

                        {status === 'paid' && (
                          <div className="text-center text-green-700 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Переплатил - ему вернут
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Помощь</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">📝 Как использовать:</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Добавьте всех участников мероприятия</li>
                  <li>Внесите все покупки с ценами и количеством</li>
                  <li>Распределите потребление каждого продукта</li>
                  <li>Нажмите "Рассчитать переводы" для получения итогов</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">💡 Полезные фишки:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Используйте быстрый выбор долей (1/2, 1/3, и т.д.)</li>
                  <li>Приложение само группирует одинаковые продукты</li>
                  <li>Можно редактировать участников и покупки</li>
                  <li>Расчёт учитывает копейки до последней</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200 text-center">
                <p className="text-gray-600 mb-2">Разработчик: Владимир Васякин</p>
                <button
                  onClick={copyEmail}
                  className="text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 mx-auto"
                >
                  <Copy className="w-4 h-4" />
                  {emailCopied ? '✓ Скопировано!' : 'e@mailvladimir.ru'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Точно всё сбросить?</h3>
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
};

export default PartyCalculator;
