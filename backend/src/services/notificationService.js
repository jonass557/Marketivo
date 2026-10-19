const nodemailer = require('nodemailer');

// Configuration email (à personnaliser avec vos identifiants)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'votre-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'votre-mot-de-passe-app'
  }
});

// Formater le prix en XAF
const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-CM', { style: 'decimal' }).format(price) + ' XAF';
};

// Générer le contenu de la notification
const generateOrderContent = (order, customer, items) => {
  const itemsList = items.map(item => 
    `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
  ).join('\n');

  const content = {
    subject: `🛒 Nouvelle commande #${order.id} sur MyShop`,
    text: `
═══════════════════════════════════
🛒 NOUVELLE COMMANDE #${order.id}
═══════════════════════════════════

📅 Date: ${new Date(order.createdAt).toLocaleString('fr-FR')}

👤 INFORMATIONS CLIENT
───────────────────────────────────
Nom: ${customer.fullName}
Email: ${customer.email}
Téléphone: ${customer.phone || 'Non renseigné'}
Adresse: ${order.shippingAddress || 'Non renseignée'}

📦 PRODUITS COMMANDÉS
───────────────────────────────────
${itemsList}

💰 RÉCAPITULATIF
───────────────────────────────────
Sous-total: ${formatPrice(order.subtotal || order.total)}
Livraison: ${formatPrice(order.shippingCost || 0)}
TOTAL: ${formatPrice(order.total)}

💳 Mode de paiement: ${order.paymentMethod || 'Paiement à la livraison'}

═══════════════════════════════════
    `,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🛒 Nouvelle Commande</h1>
        <p style="color: white; margin: 10px 0 0;">Commande #${order.id}</p>
      </div>
      
      <div style="padding: 20px; background: #f9fafb;">
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #f97316; padding-bottom: 10px;">👤 Informations Client</h2>
          <table style="width: 100%;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Nom:</td><td style="padding: 8px 0; font-weight: bold;">${customer.fullName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;">${customer.email}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Téléphone:</td><td style="padding: 8px 0;">${customer.phone || 'Non renseigné'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Adresse:</td><td style="padding: 8px 0;">${order.shippingAddress || 'Non renseignée'}</td></tr>
          </table>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #f97316; padding-bottom: 10px;">📦 Produits Commandés</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Produit</th>
                <th style="padding: 10px; text-align: center;">Qté</th>
                <th style="padding: 10px; text-align: right;">Prix</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 10px;">${item.name}</td>
                  <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="background: #f97316; border-radius: 8px; padding: 20px; color: white;">
          <h2 style="margin: 0 0 15px;">💰 Total: ${formatPrice(order.total)}</h2>
          <p style="margin: 0;">Mode de paiement: ${order.paymentMethod || 'Paiement à la livraison'}</p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MyShop - Tous droits réservés</p>
      </div>
    </div>
    `
  };

  return content;
};

// Envoyer notification par Email
const sendEmailNotification = async (adminEmail, order, customer, items) => {
  try {
    const content = generateOrderContent(order, customer, items);
    
    await transporter.sendMail({
      from: `"MyShop" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: content.subject,
      text: content.text,
      html: content.html
    });
    
    console.log('✅ Email envoyé à:', adminEmail);
    return { success: true, method: 'email' };
  } catch (error) {
    console.error('❌ Erreur email:', error.message);
    return { success: false, method: 'email', error: error.message };
  }
};

// Générer le lien WhatsApp pour notification admin
const generateWhatsAppLink = (adminPhone, order, customer, items) => {
  const itemsList = items.map(item => 
    `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
  ).join('\n');

  const message = `🛒 *NOUVELLE COMMANDE #${order.id}*

📅 ${new Date(order.createdAt).toLocaleString('fr-FR')}

👤 *CLIENT*
Nom: ${customer.fullName}
Email: ${customer.email}
Tél: ${customer.phone || 'Non renseigné'}
Adresse: ${order.shippingAddress || 'Non renseignée'}

📦 *PRODUITS*
${itemsList}

💰 *TOTAL: ${formatPrice(order.total)}*
💳 ${order.paymentMethod || 'Paiement à la livraison'}`;

  // Nettoyer le numéro de téléphone (enlever les espaces, +, etc.)
  const cleanPhone = adminPhone.replace(/[\s+\-()]/g, '');
  
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

// Envoyer toutes les notifications
const sendOrderNotifications = async (order, customer, items, adminConfig) => {
  const results = [];

  // Envoyer par email
  if (adminConfig.email) {
    const emailResult = await sendEmailNotification(adminConfig.email, order, customer, items);
    results.push(emailResult);
  }

  // Générer le lien WhatsApp (l'envoi automatique n'est pas possible sans API Business)
  if (adminConfig.whatsapp) {
    const whatsappLink = generateWhatsAppLink(adminConfig.whatsapp, order, customer, items);
    results.push({ 
      success: true, 
      method: 'whatsapp', 
      link: whatsappLink,
      note: 'Lien WhatsApp généré - Cliquez pour envoyer'
    });
  }

  return results;
};

module.exports = {
  sendEmailNotification,
  generateWhatsAppLink,
  sendOrderNotifications,
  generateOrderContent
};
