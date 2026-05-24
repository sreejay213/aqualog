{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .AppleSystemUIFontMonospaced-Regular;}
{\colortbl;\red255\green255\blue255;\red108\green0\blue181;\red255\green255\blue255;\red11\green11\blue11;
\red162\green55\blue4;\red104\green102\blue97;\red167\green0\blue20;\red16\green19\blue24;\red15\green112\blue1;
\red14\green110\blue109;}
{\*\expandedcolortbl;;\cssrgb\c50588\c0\c76078;\cssrgb\c100000\c100000\c100000;\cssrgb\c4314\c4314\c4314;
\cssrgb\c70196\c29020\c0;\cssrgb\c48235\c47451\c45490;\cssrgb\c72157\c3922\c9412;\cssrgb\c7843\c9412\c12157;\cssrgb\c0\c50196\c0;
\cssrgb\c0\c50196\c50196;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\fs18 \cf2 \cb3 \expnd0\expndtw0\kerning0
\outl0\strokewidth0 \strokec2 export\cf4 \strokec4  \cf2 \strokec2 default\cf4 \strokec4  \cf2 \strokec2 async\cf4 \strokec4  \cf2 \strokec2 function\cf4 \strokec4  \cf5 \strokec5 handler\cf4 \strokec4 (\cf5 \strokec5 req\cf4 \strokec4 , \cf5 \strokec5 res\cf4 \strokec4 ) \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \cf2 \strokec2 if\cf4 \strokec4  (\cf5 \strokec5 req\cf4 \strokec4 .\cf7 \strokec7 method\cf4 \strokec4  \cf8 \strokec8 !==\cf4 \strokec4  \cf9 \strokec9 "POST"\cf4 \strokec4 ) \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \cf2 \strokec2 return\cf4 \strokec4  \cf5 \strokec5 res\cf4 \strokec4 .\cf7 \strokec7 status\cf4 \strokec4 (\cf10 \strokec10 405\cf4 \strokec4 ).\cf7 \strokec7 json\cf4 \strokec4 (\{ \cf7 \strokec7 error\cf4 \strokec4 : \cf9 \strokec9 "Method not allowed"\cf4 \strokec4  \});\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \}\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4 \'a0\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \cf2 \strokec2 const\cf4 \strokec4  \{ prompt \} \cf8 \strokec8 =\cf4 \strokec4  \cf5 \strokec5 req\cf4 \strokec4 .\cf7 \strokec7 body\cf4 \strokec4 ;\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \cf2 \strokec2 if\cf4 \strokec4  (\cf8 \strokec8 !\cf5 \strokec5 prompt\cf4 \strokec4 ) \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \cf2 \strokec2 return\cf4 \strokec4  \cf5 \strokec5 res\cf4 \strokec4 .\cf7 \strokec7 status\cf4 \strokec4 (\cf10 \strokec10 400\cf4 \strokec4 ).\cf7 \strokec7 json\cf4 \strokec4 (\{ \cf7 \strokec7 error\cf4 \strokec4 : \cf9 \strokec9 "No prompt provided"\cf4 \strokec4  \});\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \}\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4 \'a0\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \cf2 \strokec2 try\cf4 \strokec4  \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \cf2 \strokec2 const\cf4 \strokec4  \cf5 \strokec5 response\cf4 \strokec4  \cf8 \strokec8 =\cf4 \strokec4  \cf2 \strokec2 await\cf4 \strokec4  \cf5 \strokec5 fetch\cf4 \strokec4 (\cf9 \strokec9 "https://api.anthropic.com/v1/messages"\cf4 \strokec4 , \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4       \cf7 \strokec7 method\cf4 \strokec4 : \cf9 \strokec9 "POST"\cf4 \strokec4 ,\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4       \cf7 \strokec7 headers\cf4 \strokec4 : \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4         \cf9 \strokec9 "Content-Type"\cf4 \strokec4 : \cf9 \strokec9 "application/json"\cf4 \strokec4 ,\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4         \cf9 \strokec9 "x-api-key"\cf4 \strokec4 : \cf5 \strokec5 process\cf4 \strokec4 .\cf7 \strokec7 env\cf4 \strokec4 .\cf7 \strokec7 ANTHROPIC_KEY\cf4 \strokec4 ,\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4         \cf9 \strokec9 "anthropic-version"\cf4 \strokec4 : \cf9 \strokec9 "2023-06-01"\cf4 \strokec4 ,\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4       \},\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4       \cf7 \strokec7 body\cf4 \strokec4 : \cf5 \strokec5 JSON\cf4 \strokec4 .\cf7 \strokec7 stringify\cf4 \strokec4 (\{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4         \cf7 \strokec7 model\cf4 \strokec4 : \cf9 \strokec9 "claude-sonnet-4-20250514"\cf4 \strokec4 ,\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4         \cf7 \strokec7 max_tokens\cf4 \strokec4 : \cf10 \strokec10 400\cf4 \strokec4 ,\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4         \cf7 \strokec7 messages\cf4 \strokec4 : [\{ \cf7 \strokec7 role\cf4 \strokec4 : \cf9 \strokec9 "user"\cf4 \strokec4 , \cf7 \strokec7 content\cf4 \strokec4 : \cf5 \strokec5 prompt\cf4 \strokec4  \}],\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4       \}),\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \});\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4 \'a0\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \cf2 \strokec2 const\cf4 \strokec4  \cf5 \strokec5 data\cf4 \strokec4  \cf8 \strokec8 =\cf4 \strokec4  \cf2 \strokec2 await\cf4 \strokec4  \cf5 \strokec5 response\cf4 \strokec4 .\cf7 \strokec7 json\cf4 \strokec4 ();\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4 \'a0\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \cf2 \strokec2 if\cf4 \strokec4  (\cf5 \strokec5 data\cf4 \strokec4 .\cf7 \strokec7 error\cf4 \strokec4 ) \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4       \cf2 \strokec2 return\cf4 \strokec4  \cf5 \strokec5 res\cf4 \strokec4 .\cf7 \strokec7 status\cf4 \strokec4 (\cf10 \strokec10 500\cf4 \strokec4 ).\cf7 \strokec7 json\cf4 \strokec4 (\{ \cf7 \strokec7 error\cf4 \strokec4 : \cf5 \strokec5 data\cf4 \strokec4 .\cf7 \strokec7 error\cf4 \strokec4 .\cf7 \strokec7 message\cf4 \strokec4  \});\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \}\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4 \'a0\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \cf2 \strokec2 return\cf4 \strokec4  \cf5 \strokec5 res\cf4 \strokec4 .\cf7 \strokec7 status\cf4 \strokec4 (\cf10 \strokec10 200\cf4 \strokec4 ).\cf7 \strokec7 json\cf4 \strokec4 (\{ \cf7 \strokec7 text\cf4 \strokec4 : \cf5 \strokec5 data\cf4 \strokec4 .\cf7 \strokec7 content\cf4 \strokec4 [\cf10 \strokec10 0\cf4 \strokec4 ].\cf7 \strokec7 text\cf4 \strokec4  \});\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \} \cf2 \strokec2 catch\cf4 \strokec4  (\cf5 \strokec5 err\cf4 \strokec4 ) \{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4     \cf2 \strokec2 return\cf4 \strokec4  \cf5 \strokec5 res\cf4 \strokec4 .\cf7 \strokec7 status\cf4 \strokec4 (\cf10 \strokec10 500\cf4 \strokec4 ).\cf7 \strokec7 json\cf4 \strokec4 (\{ \cf7 \strokec7 error\cf4 \strokec4 : \cf5 \strokec5 err\cf4 \strokec4 .\cf7 \strokec7 message\cf4 \strokec4  \});\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4   \}\cb1 \
\pard\pardeftab720\partightenfactor0
\cf6 \strokec6 \
\pard\pardeftab720\partightenfactor0
\cf4 \cb3 \strokec4 \}\cb1 \
}