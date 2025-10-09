import React, { useState } from 'react';
import { Share2, Users, Plus, Calculator, Send, CheckCircle, Clock, XCircle, ShoppingCart, Trash2, Edit2, RotateCcw, Mail } from 'lucide-react';

const PartyCalculator = () => {
  const [screen, setScreen] = useState('main');
  const [activeTab, setActiveTab] = useState('participants');
  const [eventName, setEventName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [newPurchase, setNewPurchase] = useState({
    product: '',
    price: '',
    quantity: '',
    buyer: '',
    consumers: []
  });
  const [settlements, setSettlements] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Сброс всего
  const resetAll = () => {
    setScreen('main');
    setActiveTab('participants');
    setEventName('');
    setParticipants([]);
    setPurchases([]);
    setNewParticipant('');
    setNewPurchase({
      product: '',
      price: '',
      quantity: '',
      buyer: '',
      consumers: []
    });
    setSettlements([]);
    setPaymentStatuses({});
    setShowResetConfirm(false);
  };

  // Создание мероприятия
  const createEvent = () => {
    if (eventName.trim()) {
      setScreen('tabs');
      setActiveTab('participants');
    }
  };

  // Добавление участника
  const addParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant)) {
      setParticipants([...participants, newParticipant]);
      setNewParticipant('');
    }
  };

  // Удаление участника
  const deleteParticipant = (index) => {
    setParticipants(participants.filter((_, idx) => idx !== index));
  };

  // Редактирование участника
  const startEditParticipant = (index) => {
    setEditingParticipant({ index, name: participants[index] });
  };

  const saveEditParticipant = () => {
    if (editingParticipant && editingParticipant.name.trim()) {
      const newParticipants = [...participants];
      newParticipants[editingParticipant.index] = editingParticipant.name;
      setParticipants(newParticipants);
      setEditingParticipant(null);
    }
  };

  // Добавление покупки
  const addPurchase = () => {
    if (newPurchase.product && newPurchase.price && newPurchase.quantity && newPurchase.buyer) {
      const consumers = newPurchase.consumers.length > 0 
        ? newPurchase.consumers 
        : participants;
      
      const price = parseFloat(newPurchase.price);
      const quantity = parseFloat(newPurchase.quantity);
      const total = price * quantity;
      
      setPurchases([...purchases, {
        ...newPurchase,
        price,
        quantity,
        total,
        consumers,
        id: Date.now()
      }]);
      
      setNewPurchase({
        product: '',
        price: '',
        quantity: '',
        buyer: '',
        consumers: []
      });
    }
  };

  // Удаление покупки
  const deletePurchase = (id) => {
    setPurchases(purchases.filter(p => p.id !== id));
  };

  // Редактирование покупки
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

  // Переключение потребителя
  const toggleConsumer = (person) => {
    const current = newPurchase.consumers;
    if (current.includes(person)) {
      setNewPurchase({
        ...newPurchase,
        consumers: current.filter(p => p !== person)
      });
    } else {
      setNewPurchase({
        ...newPurchase,
        consumers: [...current, person]
      });
    }
  };

  // Группировка продуктов для таблицы потребления
  const getConsumptionTable = () => {
    const productGroups = {};
    
    purchases.forEach(purchase => {
      const key = purchase.product;
      if (!productGroups[key]) {
        productGroups[key] = [];
      }
      productGroups[key].push(purchase);
    });

    return productGroups;
  };

  // Проверка, есть ли продукты с одинаковым названием но разной ценой
  const hasDuplicateProductNames = () => {
    const productPrices = {};
    purchases.forEach(p => {
      if (!productPrices[p.product]) {
        productPrices[p.product] = new Set();
      }
      productPrices[p.product].add(p.price);
    });
    
    return Object.keys(productPrices).some(product => productPrices[product].size > 1);
  };

  // Расчёт балансов
  const calculateBalances = () => {
    const balances = {};
    participants.forEach(p => balances[p] = 0);

    purchases.forEach(purchase => {
      const shareAmount = purchase.total / purchase.consumers.length;
      
      balances[purchase.buyer] += purchase.total;
      
      purchase.consumers.forEach(person => {
        balances[person] -= shareAmount;
      });
    });

    const debts = [];
    const creditors = [];
    
    Object.entries(balances).forEach(([person, balance]) => {
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

  // Генерация текста для отправки
  const generateShareText = () => {
    let text = `💰 Итоговый расчёт "${eventName}"\n\n`;
    
    settlements.forEach(s => {
      const statusIcon = paymentStatuses[s.id] === 'paid' ? '✅' : 
                        paymentStatuses[s.id] === 'pending' ? '⏳' : '❌';
      text += `${statusIcon} ${s.from} → ${s.to}: ${s.amount}₽\n`;
    });
    
    return text;
  };

  // Генерация ссылок для мессенджеров
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

  // Генерация ссылки для оплаты
  const generatePaymentLink = (transaction) => {
    const comment = encodeURIComponent(`${eventName} - расчёт`);
    return `https://qr.nspk.ru/?amount=${transaction.amount}&comment=${comment}`;
  };

  // Изменение статуса оплаты
  const updatePaymentStatus = (transactionId, status) => {
    setPaymentStatuses({...paymentStatuses, [transactionId]: status});
  };

  // Главный экран
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

  // Экран с вкладками
  if (screen === 'tabs') {
    const tabs = [
      { id: 'participants', label: 'Участники', icon: Users },
      { id: 'purchases', label: 'Покупки', icon: ShoppingCart },
      { id: 'consumption', label: 'Потребление', icon: Calculator },
      { id: 'settlement', label: 'Расчёты', icon: CheckCircle }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-20">
        <div className="max-w-md mx-auto mt-6">
          <div className="bg-white rounded-t-2xl shadow-xl">
            {/* Хедер */}
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

            {/* Табы */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-max px-4 py-3 font-medium text-sm flex items-center justify-center gap-2 transition ${
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

            {/* Контент вкладок */}
            <div className="p-4">
              {/* Участники */}
              {activeTab === 'participants' && (
                <div>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Имя участника"
                      value={newParticipant}
                      onChange={(e) => setNewParticipant(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={addParticipant}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {participants.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                        {editingParticipant?.index === i ? (
                          <>
                            <input
                              type="text"
                              value={editingParticipant.name}
                              onChange={(e) => setEditingParticipant({...editingParticipant, name: e.target.value})}
                              onKeyPress={(e) => e.key === 'Enter' && saveEditParticipant()}
                              className="flex-1 px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none"
                              autoFocus
                            />
                            <div className="flex gap-2 ml-2">
                              <button
                                onClick={saveEditParticipant}
                                className="text-green-600 hover:text-green-700"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingParticipant(null)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-gray-700">{p}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditParticipant(i)}
                                className="text-indigo-500 hover:text-indigo-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteParticipant(i)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
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

              {/* Покупки */}
              {activeTab === 'purchases' && (
                <div>
                  {participants.length < 2 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Сначала добавьте участников</p>
                    </div>
                  ) : (
                    <>
                      {/* Форма добавления */}
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
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>

                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Кто потребляет:</p>
                            <div className="bg-white rounded-lg p-2 space-y-1">
                              <label className="flex items-center gap-2 cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={newPurchase.consumers.length === 0}
                                  onChange={() => setNewPurchase({...newPurchase, consumers: []})}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-gray-700">Все участники</span>
                              </label>
                              {participants.map(p => (
                                <label key={p} className="flex items-center gap-2 cursor-pointer p-1">
                                  <input
                                    type="checkbox"
                                    checked={newPurchase.consumers.includes(p)}
                                    onChange={() => toggleConsumer(p)}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm text-gray-700">{p}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={addPurchase}
                            disabled={!newPurchase.product || !newPurchase.price || !newPurchase.quantity || !newPurchase.buyer}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300"
                          >
                            Добавить покупку
                          </button>
                        </div>
                      </div>

                      {/* Список покупок */}
                      <div className="space-y-2">
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
                                <p className="text-xs text-gray-500">
                                  Потребители: {purchase.consumers.join(', ')}
                                </p>
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

              {/* Потребление */}
              {activeTab === 'consumption' && (
                <div>
                  {purchases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Сначала добавьте покупки</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold text-gray-700">Участник</th>
                            {Object.entries(getConsumptionTable()).map(([product, items]) => {
                              const showPrice = items.length > 1 || 
                                purchases.filter(p => p.product === product).length > items.length;
                              return items.map((item, idx) => (
                                <th key={`${product}-${idx}`} className="text-center p-2 font-semibold text-gray-700">
                                  <div>{product}</div>
                                  {showPrice && (
                                    <div className="text-xs text-gray-500 font-normal">
                                      ({item.price}₽)
                                    </div>
                                  )}
                                </th>
                              ));
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map(person => (
                            <tr key={person} className="border-b border-gray-200">
                              <td className="p-2 font-medium text-gray-700">{person}</td>
                              {Object.values(getConsumptionTable()).flatMap(items => 
                                items.map((item, idx) => (
                                  <td key={`${item.id}-${idx}`} className="text-center p-2">
                                    {item.consumers.includes(person) ? (
                                      <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                        ✓
                                      </span>
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                ))
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Расчёты */}
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
                      <div className="space-y-3 mb-6">
                        {settlements.map((transaction) => {
                          const status = paymentStatuses[transaction.id];
                          const statusConfig = {
                            unpaid: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', text: 'Не оплачено' },
                            pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', text: 'Ожидает подтверждения' },
                            paid: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', text: 'Оплачено' }
                          }[status];
                          
                          const StatusIcon = statusConfig.icon;

                          return (
                            <div key={transaction.id} className={`${statusConfig.bg} p-4 rounded-lg border-2 ${status === 'paid' ? 'border-green-200' : 'border-transparent'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {transaction.from} → {transaction.to}
                                  </p>
                                  <p className="text-2xl font-bold text-indigo-600">{transaction.amount}₽</p>
                                </div>
                                <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
                              </div>
                              
                              <div className="flex gap-2">
                                {status === 'unpaid' && (
                                  <>
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
            </div>
          </div>
        </div>

        {/* Модальное окно подтверждения сброса */}
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
