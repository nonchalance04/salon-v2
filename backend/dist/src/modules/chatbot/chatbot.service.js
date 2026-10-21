// Recognize common Tagalog/Taglish phrasing; ambiguous short replies inherit the
// most recent user language. Model text never decides the customer's language.
export function chatbotLanguage(message, history = []) {
    const tagalog = /\b(ako|ko|akin|ikaw|mo|ninyo|niyo|kayo|po|opo|oo|hindi|ano|paano|pano|magkano|saan|kailan|pwede|puwede|gusto|nais|salamat|buhok|kuko|kulay|gupit|pagupit|pagpapagupit|tuyo|bukas|ngayon|oras|bayad|patakaran|serbisyo|presyo|kanselahin|ikansela|kanselasyon|ilipat|palitan|iskedyul|petsa|sarado|malabo|intindihan|naman|lang|ba|ang|mga|yung|iyong|iyang)\b/i;
    const english = /\b(i|my|you|your|what|how|where|when|please|want|need|is|are|can|the)\b/i;
    for (const text of [message, ...history.filter(turn => turn.role === "user").map(turn => turn.text).reverse()]) {
        if (tagalog.test(text))
            return "tl";
        if (english.test(text))
            return "en";
    }
    return "en";
}
// Identify the salon topic so the question can use the matching guidance.
export function chatbotTopic(message) {
    const text = message.toLowerCase();
    if (/\b(cancel|cancellation|kanselahin|ikansela|kanselasyon)\b/.test(text))
        return "cancel";
    if (/\b(reschedule|rescheduling)\b|\b(change|move|ilipat|palitan)\b.*\b(appointment|booking|date|time|schedule|iskedyul|petsa)\b/.test(text))
        return "reschedule";
    if (/\b(hour|hours|open|opening|close|closing|address|location|contact|phone|email|oras|saan|lokasyon|sarado)\b/.test(text))
        return "salon";
    if (/\b(available|availability|slot|today|tomorrow|ngayon|bukas)\b/.test(text))
        return "availability";
    if (/\b(service|services|price|prices|cost|haircut|color|colour|treatment|manicure|pedicure|nail|nails|massage|spa|serbisyo|presyo|magkano|gupit|pagupit|pagpapagupit)\b/.test(text))
        return "services";
    if (/\b(policy|policies|fee|fees|payment|pay|hold|late|no.show|bayad|patakaran)\b/.test(text))
        return "policy";
    if (/\b(book|booking|appointment|appointments)\b/.test(text))
        return "booking";
    return "help";
}
// Read-only guidance. No generated availability, private appointment lookup, or mutations.
export function createChatbotService(source) {
    return { async answer(message, history = [], options) {
            const tl = chatbotLanguage(message, history) === "tl";
            const topic = options?.topic ?? chatbotTopic(message);
            const links = [{ label: tl ? "Humanap ng oras at mag-book" : "Find a time and book", href: "/availability" }, { label: tl ? "Pamahalaan ang aking appointment" : "Manage my appointment", href: "/appointment" }];
            let answer;
            switch (topic) {
                case "services": {
                    const catalog = (await source.publicServices()).filter(s => s.price.gt(0));
                    // Explicit catalog-name matching is for factual lookup, never suitability advice.
                    const named = catalog.filter(s => message.toLowerCase().includes(s.name.toLowerCase()));
                    const selected = options?.serviceIds?.length ? catalog.filter(s => options.serviceIds.includes(s.id)) : named;
                    const services = selected.length ? selected : catalog;
                    answer = services.length ? services.map(s => `${s.name}: PHP ${s.price.toFixed(2)}, ${s.durationMinutes} ${tl ? "minuto" : "minutes"}.${s.description ? ` ${s.description}` : ""}`).join("\n") : (tl ? "Walang nakalistang serbisyo sa ngayon. Mangyaring makipag-ugnayan sa salon." : "No services are currently listed. Please contact the salon.");
                    break;
                }
                case "salon": {
                    const salon = await source.publicSalon();
                    const details = salon.profile ? [salon.profile.name, salon.profile.address, salon.profile.phone, salon.profile.email].filter(Boolean).join(" · ") : (tl ? "Hindi pa nakalagay ang impormasyon sa pakikipag-ugnayan sa salon." : "Salon contact information has not been configured.");
                    const hours = salon.hours.map(h => `${h.dayOfWeek.charAt(0) + h.dayOfWeek.slice(1).toLowerCase()}: ${h.openTime.toISOString().slice(11, 16)}–${h.closeTime.toISOString().slice(11, 16)}`).join("\n");
                    const closures = salon.closures.map(c => `${c.startsAt.toLocaleString("en-PH", { timeZone: salon.timeZone })}–${c.endsAt.toLocaleString("en-PH", { timeZone: salon.timeZone })}`).join("\n");
                    answer = `${details}\n${tl ? "Oras ng pagbubukas" : "Hours"} (${salon.timeZone}):\n${hours || (tl ? "Walang nakalistang oras ng pagbubukas." : "No opening hours are listed.")}${closures ? `\n${tl ? "Mga nakatakdang pagsasara" : "Upcoming closures"}:\n${closures}` : ""}\n${tl ? "Hindi garantiya ng bakanteng appointment ang oras ng pagbubukas. Piliin ang Humanap ng oras at mag-book para tingnan." : "Opening hours do not guarantee an available appointment. Use Find a time to check."}`;
                    break;
                }
                case "policy": {
                    const p = await source.publicPolicy();
                    answer = p ? tl ? `Kasalukuyang patakaran para sa bagong booking (bersyon ${p.version}): bayad sa appointment ${p.appointmentFeeType === "FIXED" ? `PHP ${p.appointmentFeeAmount.toFixed(2)}` : `${p.appointmentFeeAmount.toString()}%`}; palugit sa pagbabayad ${p.bookingHoldMinutes} minuto; mag-book nang hindi bababa sa ${p.minimumBookingLeadMinutes} minuto at hanggang ${p.advanceBookingDays} araw bago ang appointment. Hanggang ${p.maxReschedules} paglipat ng iskedyul, hindi bababa sa ${p.rescheduleCutoffHours} oras bago ang appointment. Hangganan sa pagkansela: ${p.cancellationCutoffHours} oras bago ang appointment. Palugit sa pagbawi ng hindi nadaluhang appointment: ${p.noShowGraceHours} oras. Ang mga dati nang appointment ay sumusunod sa kanilang orihinal na patakaran. Hiwalay ang bayad sa appointment sa bayad pagkatapos ng serbisyo. Kailangang suriin ng salon ang huling pagbabayad; hindi nito ibinabalik ang nag-expire na reserbasyon.` : `Current policy for new bookings (version ${p.version}): appointment fee ${p.appointmentFeeType === "FIXED" ? `PHP ${p.appointmentFeeAmount.toFixed(2)}` : `${p.appointmentFeeAmount.toString()}%`}; payment hold ${p.bookingHoldMinutes} minutes; book at least ${p.minimumBookingLeadMinutes} minutes ahead and up to ${p.advanceBookingDays} days ahead. Up to ${p.maxReschedules} reschedules, at least ${p.rescheduleCutoffHours} hours before the appointment. Cancellation cutoff: ${p.cancellationCutoffHours} hours before the appointment. No-show recovery grace: ${p.noShowGraceHours} hours. Existing appointments retain their original policy. The appointment fee is separate from the post-service charge. Late payments require salon review and do not restore expired reservations.` : (tl ? "Hindi pa nakalagay ang mga patakaran sa pag-book. Mangyaring makipag-ugnayan sa salon." : "Booking policies are not configured yet. Please contact the salon.");
                    break;
                }
                case "cancel":
                    answer = tl ? "Buksan ang Pamahalaan ang aking appointment at patunayan ang iyong access gamit ang booking code at mga opsyon doon. Huwag ibahagi sa chat ang mga code o pribadong link. Maaari lamang kanselahin ang kwalipikadong kumpirmadong appointment sa o bago ang takdang hangganan sa orihinal nitong patakaran. Pagkatapos nito, makipag-ugnayan sa salon. Inaalis ng pagkansela ang reserbasyon. Hindi nagbabago ang nakolektang bayad sa appointment." : "Open Manage my appointment and verify access using your booking code and the verification options shown there. Keep codes and private booking links out of chat. Only eligible confirmed appointments can be cancelled, at or before the cancellation cutoff in that appointment’s original policy. After the cutoff, contact the salon. Cancellation releases the reservation. The collected appointment fee remains unchanged.";
                    break;
                case "reschedule":
                    answer = tl ? "Buksan ang Pamahalaan ang aking appointment at patunayan ang iyong access gamit ang booking code at mga opsyon doon. Huwag ibahagi sa chat ang mga code o pribadong link. Maaaring ilipat ang kwalipikadong kumpirmadong appointment ayon sa hangganan at limitasyon ng orihinal nitong patakaran. Pumili ng serbisyo, staff at bagong oras; susuriin ng sistema ang availability ng lahat ng napiling serbisyo. Mananatili ang kasalukuyang reserbasyon kung hindi magtagumpay ang pagbabago." : "Open Manage my appointment and verify access using your booking code and the verification options shown there. Keep codes and private booking links out of chat. An eligible confirmed appointment may be rescheduled within its original policy’s cutoff and reschedule limit. Choose services, staff and a new time; the booking system checks availability for all selected services. Your current reservation remains if the change fails.";
                    break;
                case "availability":
                    answer = tl ? "Piliin ang Humanap ng oras at mag-book para pumili ng serbisyo, staff at petsa. Doon makikita ang kasalukuyang availability mula sa sistema ng salon. Susuriing muli ang oras kapag nag-book ka; hindi makapagkukumpirma o makapagpapareserba ng oras ang chat na ito." : "Use Find a time and book to select your services, staff preference and date. That screen requests live availability from the salon’s scheduling service. Suggested times remain subject to revalidation when you book; this chat cannot confirm or reserve a time.";
                    break;
                case "booking":
                    answer = tl ? "Piliin ang Humanap ng oras at mag-book, pumili ng serbisyo at staff, at pumili ng bakanteng petsa at oras. Ilagay ang iyong contact details at isumite. Ingatan ang booking code at pribadong link; huwag ibahagi sa chat. Bayaran ang appointment fee bago matapos ang palugit; makukumpirma lamang ang booking kapag napatunayan ng sistema ang bayad bago matapos ang palugit. Tingnan ang status sa Pamahalaan ang aking appointment." : "Choose Find a time and book, select services and staff preferences, then choose an available date and time. Enter your contact details and submit. Keep your booking code and private booking link safe; do not share them in chat. Pay the appointment fee before the hold expires; a booking is confirmed only after the system verifies payment before the hold expires. Use Manage my appointment to view its status.";
                    break;
                default: answer = tl
                    ? "Paumanhin, hindi ko pa malinaw na nauunawaan ang iyong tanong. Maaari mo bang linawin kung ano ang kailangan mo tungkol sa buhok, kuko, serbisyo o appointment sa salon?"
                    : "Sorry, I’m not sure I understand your salon question yet. Could you clarify what you need help with regarding your hair, nails, salon services or appointment?";
            }
            return { mode: "guided", topic, answer, links };
        } };
}
//# sourceMappingURL=chatbot.service.js.map