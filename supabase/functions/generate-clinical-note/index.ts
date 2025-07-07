import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPEN_API_CLINICIAN_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionNarrative, currentSymptoms, selectedInterventions } = await req.json();

    console.log('Generating clinical note with:', {
      sessionNarrativeLength: sessionNarrative?.length,
      currentSymptomsLength: currentSymptoms?.length,
      interventionCount: selectedInterventions?.length
    });

    // Create the prompt for clinical note generation
    const prompt = `You are a licensed clinical mental health professional tasked with transforming informal session notes into clinically appropriate documentation. 

Please rewrite the following session information into a professional, clinical narrative that:
- Uses appropriate clinical terminology
- Maintains professional tone and objectivity
- Incorporates the interventions used naturally into the narrative
- References symptoms in a clinical context
- Avoids repetitive language while being thorough
- Follows standard clinical documentation practices
- Does not include specific quotes or overly detailed personal information
- Maintains HIPAA compliance

Session Information:
- Current Symptoms: ${currentSymptoms || 'None specified'}
- Informal Session Notes: ${sessionNarrative || 'None provided'}
- Interventions Used: ${selectedInterventions?.join(', ') || 'None specified'}

Please provide a clinically sound session narrative that incorporates this information appropriately:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert clinical documentation assistant. Generate professional, clinical session narratives that are appropriate for mental health documentation while maintaining uniqueness and avoiding repetitive language.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedNote = data.choices[0].message.content;

    console.log('Successfully generated clinical note');

    return new Response(JSON.stringify({ 
      success: true,
      clinicalNote: generatedNote 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-clinical-note function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});