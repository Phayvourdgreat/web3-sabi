# Web3 Sabi

Web3 Sabi is a beginner learning app that explains Web3 in plain language. Sabi means "to know" in Nigerian Pidgin.

## What it does

* Short lessons on Web3 basics
* Use Image: creates a simple illustration for the lesson
* Use Audio: reads the lesson aloud with an AI voice
* AI Tutor: answers learner questions in simple language

## How it works

The app sends each request through a Supabase edge function to an n8n workflow. The workflow calls Orbio AI for the tutor's text answers, the lesson images and the voice, then sends the result back to the app.

## Built with

Bolt, Supabase, n8n and Orbio AI

## Live demo

Vercel: https://web3-sabi.vercel.app/

Bolt backup: https://web3-learning-app-103y.bolt.host
